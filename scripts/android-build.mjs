import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const ANDROID_BUILD_TARGETS = Object.freeze({
	production: "https://nuravahubstores.com",
})

/** @param {NodeJS.ProcessEnv} env */
export function resolveAndroidBuildTarget(env) {
	const target = env.CAPACITOR_BUILD_TARGET?.trim()
	if (!target || !Object.hasOwn(ANDROID_BUILD_TARGETS, target)) {
		throw new Error("Set CAPACITOR_BUILD_TARGET to 'production' using an explicit Android build command.")
	}

	const url = ANDROID_BUILD_TARGETS[target]
	const configuredUrl = env.CAPACITOR_SERVER_URL?.trim()
	if (configuredUrl && configuredUrl !== url) {
		throw new Error("CAPACITOR_SERVER_URL does not match the production Android build target.")
	}
	return { target, url }
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const capacitorCli = path.join(projectRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor")

const PRODUCTION_SIGNING_ENV = [
	"NURAVA_ANDROID_KEYSTORE",
	"NURAVA_ANDROID_STORE_PASSWORD",
	"NURAVA_ANDROID_KEY_ALIAS",
	"NURAVA_ANDROID_KEY_PASSWORD",
]

function findSdkTool(toolName, env) {
	const sdkRoots = [env.ANDROID_SDK_ROOT, env.ANDROID_HOME, env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Android", "Sdk")]
		.filter(Boolean)
	for (const sdkRoot of sdkRoots) {
		const buildTools = path.join(sdkRoot, "build-tools")
		if (!existsSync(buildTools)) continue
		const directories = readdirSync(buildTools, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
		for (const directory of directories) {
			const names = process.platform === "win32" ? [`${toolName}.exe`, `${toolName}.bat`, toolName] : [toolName]
			for (const name of names) {
				const candidate = path.join(buildTools, directory, name)
				if (existsSync(candidate)) return candidate
			}
		}
	}
	return undefined
}

function commandExists(command, env) {
	const result = spawnSync(process.platform === "win32" ? "where.exe" : "which", [command], {
		encoding: "utf8",
		env,
		stdio: ["ignore", "pipe", "ignore"],
	})
	return result.status === 0 && Boolean(result.stdout.trim())
}

function javaToolExists(name, env) {
	const javaHomeTool = env.JAVA_HOME && path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? `${name}.exe` : name)
	return javaHomeTool ? existsSync(javaHomeTool) : commandExists(name, env)
}

/** @param {NodeJS.ProcessEnv} env @param {"apk"|"aab"} artifactType */
export function validateProductionReleaseEnvironment(env, artifactType) {
	const selected = resolveAndroidBuildTarget(env)
	if (selected.target !== "production" || selected.url !== ANDROID_BUILD_TARGETS.production) {
		throw new Error("Production release requires the approved production Android target.")
	}
	if (env.NURAVA_ANDROID_PRODUCTION_RELEASE_ENABLED?.trim() !== "1") {
		throw new Error("Production APK/AAB generation is disabled. Set NURAVA_ANDROID_PRODUCTION_RELEASE_ENABLED=1 only after the production site is deployed and the release is approved.")
	}
	const missing = PRODUCTION_SIGNING_ENV.filter((name) => !env[name]?.trim())
	if (missing.length) throw new Error(`Production signing is incomplete. Missing ${missing.join(", ")}; values are not displayed.`)
	const keystore = path.resolve(env.NURAVA_ANDROID_KEYSTORE)
	if (!path.isAbsolute(env.NURAVA_ANDROID_KEYSTORE) || !existsSync(keystore) || !statSync(keystore).isFile()) {
		throw new Error("NURAVA_ANDROID_KEYSTORE must point to an existing file using an absolute path.")
	}
	const repositoryRoot = realpathSync(projectRoot)
	const canonicalKeystore = realpathSync(keystore)
	const keystoreRelativePath = path.relative(repositoryRoot, canonicalKeystore)
	if (keystoreRelativePath === "" || (keystoreRelativePath !== ".." && !keystoreRelativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(keystoreRelativePath))) {
		throw new Error("NURAVA_ANDROID_KEYSTORE must be outside the repository.")
	}
	const fingerprint = (env.NURAVA_ANDROID_EXPECTED_CERT_SHA256 || "").replaceAll(":", "").trim()
	if (!/^[0-9a-f]{64}$/i.test(fingerprint)) {
		throw new Error("Set NURAVA_ANDROID_EXPECTED_CERT_SHA256 to the approved production certificate SHA-256 fingerprint.")
	}
	const requiredTools = artifactType === "apk"
		? [
			["Android apksigner", findSdkTool("apksigner", env) || commandExists("apksigner", env)],
			["Android aapt", findSdkTool("aapt", env) || commandExists("aapt", env)],
		]
		: [
			["Java jarsigner", javaToolExists("jarsigner", env)],
			["Java keytool", javaToolExists("keytool", env)],
			["Java runtime", javaToolExists("java", env)],
			["Android bundletool", Boolean(env.BUNDLETOOL_JAR && existsSync(env.BUNDLETOOL_JAR)) || commandExists("bundletool", env)],
		]
	const unavailable = requiredTools.filter(([, available]) => !available).map(([name]) => name)
	if (unavailable.length) throw new Error(`Production ${artifactType.toUpperCase()} verification tools are unavailable: ${unavailable.join(", ")}. Install/configure the Android SDK or Java tools before building.`)
	return { target: selected.target, url: selected.url }
}

function runNode(args, env) {
	const result = spawnSync(process.execPath, args, { cwd: projectRoot, stdio: "inherit", env })
	if (result.error) throw result.error
	if (result.status !== 0) throw new Error(`Command failed with exit code ${result.status ?? "unknown"}.`)
}

function runGradle(task, env) {
	const wrapper = process.platform === "win32" ? ".\\gradlew.bat" : "./gradlew"
	const result = spawnSync(wrapper, [task], {
		cwd: path.join(projectRoot, "android"),
		stdio: "inherit",
		env,
		shell: process.platform === "win32",
	})
	if (result.error) throw result.error
	if (result.status !== 0) throw new Error(`Gradle ${task} failed with exit code ${result.status ?? "unknown"}.`)
}

function runCapacitorCommand(command, env) {
	runNode([capacitorCli, command, "android"], env)
}

function main(args) {
	const [targetArgument, action] = args
	const target = targetArgument?.trim()
	if (!target || !Object.hasOwn(ANDROID_BUILD_TARGETS, target)) {
		throw new Error("Usage: node scripts/android-build.mjs production <sync|open|debug|release-apk|release-aab|validate>")
	}

	const env = { ...process.env }
	if (env.CAPACITOR_BUILD_TARGET?.trim() && env.CAPACITOR_BUILD_TARGET.trim() !== target) {
		throw new Error(`CAPACITOR_BUILD_TARGET conflicts with the requested '${target}' command.`)
	}
	if (env.CAPACITOR_SERVER_URL?.trim() && env.CAPACITOR_SERVER_URL.trim() !== ANDROID_BUILD_TARGETS[target]) {
		throw new Error(`CAPACITOR_SERVER_URL conflicts with the requested '${target}' command.`)
	}
	env.CAPACITOR_BUILD_TARGET = target
	env.CAPACITOR_SERVER_URL = ANDROID_BUILD_TARGETS[target]

	if (action === "validate") {
		console.log(JSON.stringify(resolveAndroidBuildTarget(env)))
		return
	}
	if (action === "sync") {
		runCapacitorCommand("sync", env)
		return
	}
	if (action === "open") {
		runCapacitorCommand("sync", env)
		runCapacitorCommand("open", env)
		return
	}
	if (action === "debug" && target === "production") {
		runCapacitorCommand("sync", env)
		runGradle("assembleDebug", env)
		return
	}
	if (action === "release-apk" && target === "production") {
		validateProductionReleaseEnvironment(env, "apk")
		env.NURAVA_ANDROID_RELEASE_WRAPPER = "1"
		runCapacitorCommand("sync", env)
		runGradle("copyReleaseApk", env)
		const verifier = path.join(projectRoot, "scripts", "verify-android-release.mjs")
		const artifacts = [
			path.join(projectRoot, "android", "app", "build", "outputs", "apk", "release", "app-release.apk"),
			path.join(projectRoot, "android", "app", "build", "outputs", "apk", "release", "nurava-hubstores.apk"),
		]
		for (const artifact of artifacts) {
			runNode([verifier, "apk", artifact], env)
		}
		const hashes = artifacts.map((artifact) => createHash("sha256").update(readFileSync(artifact)).digest("hex"))
		if (hashes[0] !== hashes[1]) {
			throw new Error("The distributable APK copy does not match the verified release APK.")
		}
		return
	}
	if (action === "release-aab" && target === "production") {
		validateProductionReleaseEnvironment(env, "aab")
		env.NURAVA_ANDROID_RELEASE_WRAPPER = "1"
		runCapacitorCommand("sync", env)
		runGradle("bundleRelease", env)
		runNode([path.join(projectRoot, "scripts", "verify-android-release.mjs"), "aab", path.join(projectRoot, "android", "app", "build", "outputs", "bundle", "release", "app-release.aab")], env)
		return
	}
	throw new Error(`Action '${action || "(missing)"}' is not allowed for the '${target}' target.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		main(process.argv.slice(2))
	} catch (error) {
		console.error(error instanceof Error ? error.message : "Android build target selection failed.")
		process.exitCode = 1
	}
}
