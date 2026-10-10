import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const gradlePath = path.join(projectRoot, "android", "app", "build.gradle")
const manifestPath = path.join(projectRoot, "frontend", "public", "downloads", "nurava-hubstores-update.json")
const builtApkPath = path.join(projectRoot, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
const publishedApkPath = path.join(projectRoot, "frontend", "public", "downloads", "nurava-hubstores-staging.apk")
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

let gradleChanged = false
try {
	const manifest = JSON.parse(manifestOriginal)
	const codeMatch = /^\s*versionCode\s+(\d+)\s*$/m.exec(gradleOriginal)
	const nameMatch = /^\s*versionName\s+"([^"]+)"\s*$/m.exec(gradleOriginal)
	if (!codeMatch || !nameMatch || !Number.isSafeInteger(manifest.versionCode)) {
		throw new Error("Could not read the Android version in Gradle and the update manifest.")
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

	const nextApkPath = `${publishedApkPath}.next`
	const nextManifestPath = `${manifestPath}.next`
	copyFileSync(builtApkPath, nextApkPath)
	const nextManifest = {
		...manifest,
		versionCode,
		versionName,
		apkUrl: `/downloads/nurava-hubstores-staging.apk?v=${versionCode}`,
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
