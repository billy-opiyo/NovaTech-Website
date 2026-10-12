import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { inflateRawSync } from "node:zlib"
import { spawnSync } from "node:child_process"

export const PRODUCTION_APP_ID = "com.nurava.hubstores"
export const PRODUCTION_URL = "https://nuravahubstores.com"

export function normalizeSha256(value) {
	return String(value || "").replace(/^SHA-?256\s*:\s*/i, "").replaceAll(":", "").replaceAll(" ", "").trim().toLowerCase()
}

export function requireExpectedCertificate(actual, expected) {
	const actualNormalized = normalizeSha256(actual)
	const expectedNormalized = normalizeSha256(expected)
	if (!/^[0-9a-f]{64}$/.test(expectedNormalized)) throw new Error("NURAVA_ANDROID_EXPECTED_CERT_SHA256 must be a 64-character SHA-256 certificate fingerprint.")
	if (!/^[0-9a-f]{64}$/.test(actualNormalized) || actualNormalized !== expectedNormalized) {
		throw new Error("The release artifact certificate does not match NURAVA_ANDROID_EXPECTED_CERT_SHA256.")
	}
	return actualNormalized
}

export function readZipEntry(zipBuffer, entryName) {
	const eocdSignature = 0x06054b50
	let eocdOffset = -1
	const scanStart = Math.max(0, zipBuffer.length - 22 - 0xffff)
	for (let offset = zipBuffer.length - 22; offset >= scanStart; offset -= 1) {
		if (zipBuffer.readUInt32LE(offset) === eocdSignature) {
			eocdOffset = offset
			break
		}
	}
	if (eocdOffset < 0) throw new Error("Release artifact is not a supported ZIP-based Android package.")
	const entries = zipBuffer.readUInt16LE(eocdOffset + 10)
	let cursor = zipBuffer.readUInt32LE(eocdOffset + 16)
	for (let index = 0; index < entries; index += 1) {
		if (zipBuffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Release artifact ZIP directory is invalid.")
		const method = zipBuffer.readUInt16LE(cursor + 10)
		const compressedSize = zipBuffer.readUInt32LE(cursor + 20)
		const nameLength = zipBuffer.readUInt16LE(cursor + 28)
		const extraLength = zipBuffer.readUInt16LE(cursor + 30)
		const commentLength = zipBuffer.readUInt16LE(cursor + 32)
		const localOffset = zipBuffer.readUInt32LE(cursor + 42)
		const name = zipBuffer.toString("utf8", cursor + 46, cursor + 46 + nameLength)
		if (name === entryName) {
			if (zipBuffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Release artifact ZIP entry is invalid.")
			const localNameLength = zipBuffer.readUInt16LE(localOffset + 26)
			const localExtraLength = zipBuffer.readUInt16LE(localOffset + 28)
			const dataOffset = localOffset + 30 + localNameLength + localExtraLength
			const compressed = zipBuffer.subarray(dataOffset, dataOffset + compressedSize)
			if (method === 0) return compressed
			if (method === 8) return inflateRawSync(compressed)
			throw new Error("Release artifact uses an unsupported ZIP compression method for its Capacitor config.")
		}
		cursor += 46 + nameLength + extraLength + commentLength
	}
	throw new Error(`Release artifact is missing ${entryName}.`)
}

export function validateEmbeddedCapacitorConfig(configText) {
	let config
	try {
		config = JSON.parse(configText)
	} catch {
		throw new Error("The packaged Capacitor config is invalid JSON.")
	}
	if (config?.appId !== PRODUCTION_APP_ID || config?.server?.url !== PRODUCTION_URL || config?.server?.cleartext !== false) {
		throw new Error("The artifact does not contain the approved production app ID, HTTPS site URL, and cleartext setting.")
	}
	return config
}

export function requireVerifiedJarSignature(output) {
	if (!/\bjar verified\./i.test(output) || /\bjar is unsigned\b|signature.*invalid|digest.*invalid/i.test(output)) {
		throw new Error("The AAB JAR signature did not pass jarsigner verification.")
	}
}

function sdkTool(name, env) {
	const sdkRoots = [env.ANDROID_SDK_ROOT, env.ANDROID_HOME, env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Android", "Sdk")].filter(Boolean)
	for (const sdkRoot of sdkRoots) {
		const directory = path.join(sdkRoot, "build-tools")
		if (!existsSync(directory)) continue
		const versions = readdirSync(directory, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
		for (const version of versions) {
			for (const extension of process.platform === "win32" ? [".exe", ".bat", ""] : [""]) {
				const candidate = path.join(directory, version, `${name}${extension}`)
				if (existsSync(candidate)) return candidate
			}
		}
	}
	return name
}

function run(command, args, env) {
	const usesCmdScript = process.platform === "win32" && (/\.(bat|cmd)$/i.test(command) || command === "bundletool")
	const result = spawnSync(command, args, { encoding: "utf8", env, windowsHide: true, maxBuffer: 8 * 1024 * 1024, shell: usesCmdScript })
	if (result.error || result.status !== 0) throw new Error(`Release verification command failed: ${path.basename(command)}.`)
	return `${result.stdout || ""}\n${result.stderr || ""}`
}

function sourceVersion(projectRoot) {
	const gradle = readFileSync(path.join(projectRoot, "android", "app", "build.gradle"), "utf8")
	const packageMatch = gradle.match(/applicationId\s+["']([^"']+)["']/)
	const codeMatch = gradle.match(/versionCode\s+(\d+)/)
	const nameMatch = gradle.match(/versionName\s+["']([^"']+)["']/)
	if (!packageMatch || !codeMatch || !nameMatch) throw new Error("Could not read Android app identity and version from android/app/build.gradle.")
	return { appId: packageMatch[1], versionCode: codeMatch[1], versionName: nameMatch[1] }
}

function certFingerprintFromApk(output) {
	const match = output.match(/Signer #\d+ certificate SHA-256 digest:\s*([0-9a-f:]+)/i)
	if (!match) throw new Error("Could not read the APK signer certificate fingerprint.")
	return match[1]
}

function verifyApk(artifact, env, projectRoot) {
	const apksigner = sdkTool("apksigner", env)
	const aapt = sdkTool("aapt", env)
	const signature = run(apksigner, ["verify", "--print-certs", artifact], env)
	const actualFingerprint = certFingerprintFromApk(signature)
	requireExpectedCertificate(actualFingerprint, env.NURAVA_ANDROID_EXPECTED_CERT_SHA256)
	const metadata = run(aapt, ["dump", "badging", artifact], env)
	const match = metadata.match(/^package:\s+name='([^']+)'\s+versionCode='([^']+)'\s+versionName='([^']*)'/m)
	if (!match) throw new Error("Could not read the APK package metadata.")
	const expected = sourceVersion(projectRoot)
	if (match[1] !== expected.appId || match[1] !== PRODUCTION_APP_ID || match[2] !== expected.versionCode || match[3] !== expected.versionName) {
		throw new Error("The APK package ID or version does not match android/app/build.gradle.")
	}
	const configBytes = readZipEntry(readFileSync(artifact), "assets/capacitor.config.json")
	validateEmbeddedCapacitorConfig(configBytes.toString("utf8"))
	return actualFingerprint
}

function certFingerprintFromAab(output) {
	const match = output.match(/SHA-?256\s*:\s*([0-9a-f: ]+)/i)
	if (!match) throw new Error("Could not read the AAB signer certificate fingerprint.")
	return match[1]
}

function verifyAab(artifact, env, projectRoot) {
	const keytool = env.JAVA_HOME
		? path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? "keytool.exe" : "keytool")
		: "keytool"
	const jarsigner = env.JAVA_HOME
		? path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? "jarsigner.exe" : "jarsigner")
		: "jarsigner"
	const bundletool = env.BUNDLETOOL_JAR
		? [env.JAVA_HOME ? path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java") : "java", ["-jar", env.BUNDLETOOL_JAR]]
		: ["bundletool", []]
	const jarVerification = run(jarsigner, ["-verify", artifact], env)
	requireVerifiedJarSignature(jarVerification)
	const certificate = run(keytool, ["-printcert", "-jarfile", artifact], env)
	const actualFingerprint = certFingerprintFromAab(certificate)
	requireExpectedCertificate(actualFingerprint, env.NURAVA_ANDROID_EXPECTED_CERT_SHA256)
	const bundleArgs = [...bundletool[1], "validate", `--bundle=${artifact}`]
	run(bundletool[0], bundleArgs, env)
	const manifest = run(bundletool[0], [...bundletool[1], "dump", "manifest", `--bundle=${artifact}`, "--module=base"], env)
	const packageMatch = manifest.match(/\bpackage=["']([^"']+)["']/)
	const codeMatch = manifest.match(/\bandroid:versionCode=["']([^"']+)["']/)
	const nameMatch = manifest.match(/\bandroid:versionName=["']([^"']*)["']/)
	const expected = sourceVersion(projectRoot)
	if (!packageMatch || !codeMatch || !nameMatch || packageMatch[1] !== expected.appId || packageMatch[1] !== PRODUCTION_APP_ID || codeMatch[1] !== expected.versionCode || nameMatch[1] !== expected.versionName) {
		throw new Error("The AAB package ID or version does not match android/app/build.gradle.")
	}
	const configBytes = readZipEntry(readFileSync(artifact), "base/assets/capacitor.config.json")
	validateEmbeddedCapacitorConfig(configBytes.toString("utf8"))
	return actualFingerprint
}

export function verifyAndroidReleaseArtifact({ artifact, type, env = process.env, projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") }) {
	if (!existsSync(artifact)) throw new Error("Release artifact does not exist.")
	const fingerprint = type === "apk" ? verifyApk(artifact, env, projectRoot) : type === "aab" ? verifyAab(artifact, env, projectRoot) : undefined
	if (!fingerprint) throw new Error("Artifact type must be apk or aab.")
	const sha256 = createHash("sha256").update(readFileSync(artifact)).digest("hex")
	return { type, sha256, certificateSha256: normalizeSha256(fingerprint) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const [type, artifact] = process.argv.slice(2)
		if (!type || !artifact) throw new Error("Usage: node scripts/verify-android-release.mjs <apk|aab> <artifact-path>")
		const result = verifyAndroidReleaseArtifact({ type, artifact: path.resolve(artifact) })
		console.log(`${type.toUpperCase()} verified. SHA-256: ${result.sha256}; signing certificate SHA-256: ${result.certificateSha256}`)
	} catch (error) {
		console.error(error instanceof Error ? error.message : "Android release artifact verification failed.")
		process.exitCode = 1
	}
}
