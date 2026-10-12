import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { copyFileSync, existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readZipEntry } from "./verify-android-release.mjs"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const gradlePath = path.join(projectRoot, "android", "app", "build.gradle")
const manifestPath = path.join(projectRoot, "frontend", "public", "downloads", "nurava-hubstores-update-staging.json")
const builtApkPath = path.join(projectRoot, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
const publishedApkPath = path.join(projectRoot, "frontend", "public", "downloads", "nurava-hubstores-staging.apk")
const sdkRoots = [process.env.ANDROID_SDK_ROOT, process.env.ANDROID_HOME, process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android", "Sdk")].filter(Boolean)
const gradleOriginal = readFileSync(gradlePath, "utf8")
const manifestOriginal = readFileSync(manifestPath, "utf8")

function run(command, args, cwd = projectRoot) {
	const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" })
	if (result.error) throw result.error
	if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status ?? "unknown"}.`)
}

function incrementPatch(versionName) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(versionName)
	if (!match) throw new Error(`Expected android/app/build.gradle versionName to use major.minor.patch; got "${versionName}".`)
	return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`
}

function findBuildTool(name) {
	for (const sdkRoot of sdkRoots) {
		const buildTools = path.join(sdkRoot, "build-tools")
		if (!existsSync(buildTools)) continue
		const versions = readdirSync(buildTools, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
		for (const version of versions) {
			const names = process.platform === "win32" ? [`${name}.exe`, `${name}.bat`, name] : [name]
			for (const candidateName of names) {
				const candidate = path.join(buildTools, version, candidateName)
				if (existsSync(candidate)) return candidate
			}
		}
	}
	throw new Error(`Android SDK verification tool ${name} is required to publish a staging update.`)
}

function runCaptured(command, args) {
	const result = spawnSync(command, args, {
		cwd: projectRoot,
		encoding: "utf8",
		shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(command),
	})
	if (result.error || result.status !== 0) throw new Error(`Staging APK verification failed: ${path.basename(command)}.`)
	return `${result.stdout || ""}\n${result.stderr || ""}`
}

function verifyStagingApk(apkPath) {
	if (!existsSync(apkPath)) throw new Error("The staging APK required for update verification is missing.")
	const signerOutput = runCaptured(findBuildTool("apksigner"), ["verify", "--print-certs", apkPath])
	const signerMatch = signerOutput.match(/Signer #\d+ certificate SHA-256 digest:\s*([0-9a-f:]+)/i)
	if (!signerMatch) throw new Error("The staging APK signing certificate could not be read.")
	const signingCertificateSha256 = signerMatch[1].replaceAll(":", "").toLowerCase()
	const metadata = runCaptured(findBuildTool("aapt"), ["dump", "badging", apkPath])
	const packageMatch = metadata.match(/^package:\s+name='([^']+)'\s+versionCode='([^']+)'\s+versionName='([^']*)'/m)
	if (!packageMatch || packageMatch[1] !== "com.nurava.hubstores") {
		throw new Error("The staging APK package ID could not be verified.")
	}
	const config = JSON.parse(readZipEntry(readFileSync(apkPath), "assets/capacitor.config.json").toString("utf8"))
	if (config.appId !== "com.nurava.hubstores" || config.server?.url !== "https://nuravatech-saas-staging.vercel.app" || config.server?.cleartext !== false) {
		throw new Error("The APK does not contain the approved staging Capacitor configuration.")
	}
	return { signingCertificateSha256, versionCode: Number(packageMatch[2]), versionName: packageMatch[3] }
}

let gradleChanged = false
try {
	const manifest = JSON.parse(manifestOriginal)
	const codeMatch = /^\s*versionCode\s+(\d+)\s*$/m.exec(gradleOriginal)
	const nameMatch = /^\s*versionName\s+"([^"]+)"\s*$/m.exec(gradleOriginal)
	if (!codeMatch || !nameMatch || !Number.isSafeInteger(manifest.versionCode)) {
		throw new Error("Could not read the Android version in Gradle and the update manifest.")
	}
	if (manifest.enabled !== true || manifest.channel !== "staging"
		|| manifest.applicationId !== "com.nurava.hubstores"
		|| manifest.apkUrl?.split("?")[0] !== "/downloads/nurava-hubstores-staging.apk") {
		throw new Error("The existing staging update manifest is invalid or points outside the staging channel.")
	}
	const publishedArtifact = verifyStagingApk(publishedApkPath)
	if (publishedArtifact.signingCertificateSha256 !== manifest.signingCertificateSha256.replaceAll(":", "").toLowerCase()) {
		throw new Error("The current staging manifest signing identity does not match its published APK.")
	}
	if (publishedArtifact.versionCode !== manifest.versionCode || publishedArtifact.versionName !== manifest.versionName) {
		throw new Error("The current staging manifest version does not match its published APK.")
	}

	const versionCode = Math.max(Number(codeMatch[1]), manifest.versionCode) + 1
	const versionName = incrementPatch(nameMatch[1])
	const gradleNext = gradleOriginal
		.replace(/^([ \t]*versionCode\s+)\d+\s*$/m, (_match, prefix) => `${prefix}${versionCode}`)
		.replace(/^([ \t]*versionName\s+")[^"]+("\s*)$/m, (_match, prefix, suffix) => `${prefix}${versionName}${suffix}`)
	if (gradleNext === gradleOriginal) throw new Error("Could not update the Android Gradle version values.")
	writeFileSync(gradlePath, gradleNext)
	gradleChanged = true

	run("npm", ["run", "android:sync"])
	const gradleCommand = process.platform === "win32" ? ".\\gradlew.bat" : "./gradlew"
	run(gradleCommand, ["assembleDebug"], path.join(projectRoot, "android"))
	if (!existsSync(builtApkPath)) throw new Error(`Android build completed without producing ${builtApkPath}.`)
	const builtArtifact = verifyStagingApk(builtApkPath)
	if (builtArtifact.signingCertificateSha256 !== publishedArtifact.signingCertificateSha256) {
		throw new Error("The new APK uses a different Android Debug signing identity; the existing staging update will not be replaced.")
	}
	if (builtArtifact.versionCode !== versionCode || builtArtifact.versionName !== versionName) {
		throw new Error("The built APK version does not match the staging manifest version being prepared.")
	}

	const nextApkPath = `${publishedApkPath}.next`
	const nextManifestPath = `${manifestPath}.next`
	copyFileSync(builtApkPath, nextApkPath)
	const copiedApkHash = createHash("sha256").update(readFileSync(nextApkPath)).digest("hex")
	const builtApkHash = createHash("sha256").update(readFileSync(builtApkPath)).digest("hex")
	if (copiedApkHash !== builtApkHash) throw new Error("The copied staging APK failed its integrity check.")
	const nextManifest = {
		enabled: true,
		channel: "staging",
		applicationId: "com.nurava.hubstores",
		versionCode,
		versionName,
		apkUrl: `/downloads/nurava-hubstores-staging.apk?v=${versionCode}`,
		signingCertificateSha256: builtArtifact.signingCertificateSha256,
		releaseNotes: process.env.NURAVA_ANDROID_RELEASE_NOTES?.trim() || "Includes the latest Android app changes.",
	}
	writeFileSync(nextManifestPath, `${JSON.stringify(nextManifest, null, "\t")}\n`)
	renameSync(nextApkPath, publishedApkPath)
	renameSync(nextManifestPath, manifestPath)
	console.log(`Staging update ${versionName} (versionCode ${versionCode}) is ready.`)
	console.log("Commit and deploy the updated Gradle file, APK, and update manifest together so installed apps can detect it.")
} catch (error) {
	if (gradleChanged) writeFileSync(gradlePath, gradleOriginal)
	throw error
}
