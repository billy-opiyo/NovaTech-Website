import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { test } from "node:test"
import {
	ANDROID_UPDATE_CHANNELS,
	CURRENT_STAGING_CERTIFICATE_SHA256,
	getAndroidUpdateManifestUrl,
	isNativeUpdateCompatible,
	normalizeCertificateSha256,
	resolveAndroidUpdateChannel,
	validateAndroidUpdateManifest,
} from "../frontend/src/lib/android-update-channel"

const projectRoot = process.cwd()

function readManifest(name: string): unknown {
	return JSON.parse(readFileSync(path.join(projectRoot, "frontend", "public", "downloads", name), "utf8")) as unknown
}

test("each exact HTTPS site origin selects only its own update manifest and APK path", () => {
	assert.equal(resolveAndroidUpdateChannel(ANDROID_UPDATE_CHANNELS.staging.origin), "staging")
	assert.equal(resolveAndroidUpdateChannel(ANDROID_UPDATE_CHANNELS.production.origin), "production")
	assert.equal(resolveAndroidUpdateChannel("https://preview-nurava.vercel.app"), null)
	assert.equal(resolveAndroidUpdateChannel("http://nuravatech-saas-staging.vercel.app"), null)
	assert.equal(resolveAndroidUpdateChannel("https://user@nuravahubstores.com"), null)
	assert.notEqual(ANDROID_UPDATE_CHANNELS.staging.manifestPath, ANDROID_UPDATE_CHANNELS.production.manifestPath)
	assert.notEqual(ANDROID_UPDATE_CHANNELS.staging.apkPath, ANDROID_UPDATE_CHANNELS.production.apkPath)
	assert.equal(getAndroidUpdateManifestUrl("staging"), "https://nuravatech-saas-staging.vercel.app/downloads/nurava-hubstores-update-staging.json")
	assert.equal(getAndroidUpdateManifestUrl("production"), "https://nuravahubstores.com/downloads/nurava-hubstores-update-production.json")
})

test("staging manifest matches package, version, pinned signer, and staging download path", () => {
	const manifest = readManifest("nurava-hubstores-update-staging.json")
	const androidGradle = readFileSync(path.join(projectRoot, "android", "app", "build.gradle"), "utf8")
	const versionCode = Number(/^\s*versionCode\s+(\d+)\s*$/m.exec(androidGradle)?.[1])
	const versionName = /^\s*versionName\s+"([^"]+)"\s*$/m.exec(androidGradle)?.[1]
	assert.ok(Number.isSafeInteger(versionCode) && versionCode > 0)
	assert.ok(versionName)
	const validated = validateAndroidUpdateManifest(manifest, "staging", versionCode - 1)
	assert.ok(validated)
	assert.equal(validated.applicationId, "com.nurava.hubstores")
	assert.equal(validated.versionCode, versionCode)
	assert.equal(validated.versionName, versionName)
	assert.equal(validated.signingCertificateSha256, CURRENT_STAGING_CERTIFICATE_SHA256)
	assert.equal(new URL(validated.apkUrl, ANDROID_UPDATE_CHANNELS.staging.origin).pathname, ANDROID_UPDATE_CHANNELS.staging.apkPath)
	assert.equal(validateAndroidUpdateManifest(manifest, "staging", versionCode - 1)?.versionCode, versionCode)
	assert.equal(validateAndroidUpdateManifest(manifest, "staging", versionCode), null)
})

test("production update feed stays disabled and never names a staging artifact", () => {
	const manifest = readManifest("nurava-hubstores-update-production.json") as Record<string, unknown>
	assert.equal(manifest.enabled, false)
	assert.equal(manifest.channel, "production")
	assert.equal(manifest.applicationId, "com.nurava.hubstores")
	assert.equal(manifest.apkUrl, ANDROID_UPDATE_CHANNELS.production.apkPath)
	assert.equal(manifest.signingCertificateSha256, "")
	assert.equal(validateAndroidUpdateManifest(manifest, "production", 17), null)
})

test("manifest validation rejects channel crossover, unsafe URLs, bad versions, and missing signer identity", () => {
	const valid = readManifest("nurava-hubstores-update-staging.json") as Record<string, unknown>
	const invalidVariants: Record<string, unknown>[] = [
		{ ...valid, channel: "production" },
		{ ...valid, apkUrl: "/downloads/nurava-hubstores-production.apk" },
		{ ...valid, apkUrl: "https://attacker.example/downloads/nurava-hubstores-staging.apk" },
		{ ...valid, apkUrl: "//attacker.example/downloads/nurava-hubstores-staging.apk" },
		{ ...valid, apkUrl: "/downloads/nurava-hubstores-staging.apk#fragment" },
		{ ...valid, applicationId: "com.other.app" },
		{ ...valid, versionCode: 17.5 },
		{ ...valid, versionName: "" },
		{ ...valid, signingCertificateSha256: "not-a-sha256-certificate" },
		{ ...valid, enabled: false },
	]
	for (const variant of invalidVariants) assert.equal(validateAndroidUpdateManifest(variant, "staging", 16), null)
	assert.equal(normalizeCertificateSha256(CURRENT_STAGING_CERTIFICATE_SHA256.match(/.{2}/g)!.join(":").toUpperCase()), CURRENT_STAGING_CERTIFICATE_SHA256)
	assert.equal(normalizeCertificateSha256("sha256-not-valid"), null)
})

test("an update is offered only after the native layer confirms installed signer compatibility", () => {
	assert.equal(isNativeUpdateCompatible(true, { compatible: true }), true)
	assert.equal(isNativeUpdateCompatible(true, { compatible: false }), false)
	assert.equal(isNativeUpdateCompatible(true, null), false)
	assert.equal(isNativeUpdateCompatible(false, { compatible: true }), false)

	const prompt = readFileSync(path.join(projectRoot, "frontend/src/components/providers/AndroidAppUpdatePrompt.tsx"), "utf8")
	assert.match(prompt, /checkUpdateCompatibility/)
	assert.match(prompt, /isNativeUpdateCompatible\(hasNativeCompatibilityCheck, compatibility\)/)
	assert.doesNotMatch(prompt, /CURRENT_STAGING_CERTIFICATE_SHA256/)
	assert.doesNotMatch(prompt, /Browser\.open/)
})

test("native updater independently enforces channel paths and validates downloaded package identity", () => {
	const nativeVerifier = readFileSync(path.join(projectRoot, "android/app/src/main/java/com/nurava/hubstores/UpdateApkVerifier.java"), "utf8")
	const nativePlugin = readFileSync(path.join(projectRoot, "android/app/src/main/java/com/nurava/hubstores/AppUpdaterPlugin.java"), "utf8")
	const receiver = readFileSync(path.join(projectRoot, "android/app/src/main/java/com/nurava/hubstores/UpdateDownloadReceiver.java"), "utf8")
	const activity = readFileSync(path.join(projectRoot, "android/app/src/main/java/com/nurava/hubstores/MainActivity.java"), "utf8")
	assert.match(nativeVerifier, /nurava-hubstores-staging\.apk/)
	assert.match(nativeVerifier, /nurava-hubstores-production\.apk/)
	assert.match(nativeVerifier, /getPackageArchiveInfo\(apkPath, flags\)/)
	assert.match(nativeVerifier, /candidateSigners\.equals\(installedSigners\)/)
	assert.match(nativePlugin, /checkUpdateCompatibility/)
	assert.match(nativePlugin, /putString\("pending_server_url", appServerUrl\)/)
	assert.match(nativePlugin, /getString\("pending_server_url", ""\)/)
	assert.match(nativePlugin, /\.remove\("pending_server_url"\)/)
	assert.match(nativePlugin, /verifyDownloadedApk\(/)
	assert.match(receiver, /verifyDownloadedApk\(/)
	assert.match(receiver, /getString\("pending_server_url", ""\)/)
	assert.match(receiver, /\.remove\("pending_server_url"\)/)
	assert.doesNotMatch(receiver, /String appServerUrl = context instanceof MainActivity/)
	assert.match(activity, /getString\("pending_server_url", ""\)/)
	assert.match(activity, /\.remove\("pending_server_url"\)/)
})

test("staging update publisher verifies the old and new APK identities before writing only the staging feed", () => {
	const publisher = readFileSync(path.join(projectRoot, "scripts/release-android-staging.mjs"), "utf8")
	assert.match(publisher, /nurava-hubstores-update-staging\.json/)
	assert.match(publisher, /verifyStagingApk\(publishedApkPath\)/)
	assert.match(publisher, /verifyStagingApk\(builtApkPath\)/)
	assert.match(publisher, /builtArtifact\.signingCertificateSha256 !== publishedArtifact\.signingCertificateSha256/)
	assert.match(publisher, /nurava-hubstores-staging\.apk\?v=/)
	assert.doesNotMatch(publisher, /nurava-hubstores-update-production\.json/)
})
