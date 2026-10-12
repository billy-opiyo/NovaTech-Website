export type AndroidUpdateChannel = "staging" | "production"

export type AndroidUpdateManifest = {
	enabled: true
	channel: AndroidUpdateChannel
	applicationId: "com.nurava.hubstores"
	versionCode: number
	versionName: string
	apkUrl: string
	signingCertificateSha256: string
	releaseNotes: string
}

export const ANDROID_UPDATE_CHANNELS = Object.freeze({
	staging: Object.freeze({
		origin: "https://nuravatech-saas-staging.vercel.app",
		manifestPath: "/downloads/nurava-hubstores-update-staging.json",
		apkPath: "/downloads/nurava-hubstores-staging.apk",
	}),
	production: Object.freeze({
		origin: "https://nuravahubstores.com",
		manifestPath: "/downloads/nurava-hubstores-update-production.json",
		apkPath: "/downloads/nurava-hubstores-production.apk",
	}),
})

// This is public signing-certificate identity data, taken from the verified
// current staging APK. Android itself remains authoritative at installation.
export const CURRENT_STAGING_CERTIFICATE_SHA256 = "dd3399211eed1a03a3270e3df943fba6eb7fcceee2935231c4f7372f209b1498"

export function normalizeCertificateSha256(value: string): string | null {
	const normalized = value.replaceAll(":", "").trim().toLowerCase()
	return /^[0-9a-f]{64}$/.test(normalized) ? normalized : null
}

export function resolveAndroidUpdateChannel(origin: string): AndroidUpdateChannel | null {
	try {
		const parsed = new URL(origin)
		if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) return null
		if (parsed.origin !== origin.replace(/\/$/, "")) return null
		if (parsed.origin === ANDROID_UPDATE_CHANNELS.staging.origin) return "staging"
		if (parsed.origin === ANDROID_UPDATE_CHANNELS.production.origin) return "production"
		return null
	} catch {
		return null
	}
}

export function getAndroidUpdateManifestUrl(channel: AndroidUpdateChannel): string {
	return `${ANDROID_UPDATE_CHANNELS[channel].origin}${ANDROID_UPDATE_CHANNELS[channel].manifestPath}`
}

export function isNativeUpdateCompatible(hasNativeCompatibilityCheck: boolean, result: unknown): boolean {
	if (!hasNativeCompatibilityCheck || !result || typeof result !== "object" || !("compatible" in result)) return false
	return result.compatible === true
}

export function validateAndroidUpdateManifest(
	value: unknown,
	channel: AndroidUpdateChannel,
	installedVersionCode: number,
): AndroidUpdateManifest | null {
	if (!value || typeof value !== "object" || !Number.isSafeInteger(installedVersionCode) || installedVersionCode < 0) return null
	const manifest = value as Record<string, unknown>
	const channelConfig = ANDROID_UPDATE_CHANNELS[channel]
	if (manifest.enabled !== true
		|| manifest.channel !== channel
		|| manifest.applicationId !== "com.nurava.hubstores"
		|| !Number.isSafeInteger(manifest.versionCode)
		|| (manifest.versionCode as number) <= installedVersionCode
		|| typeof manifest.versionName !== "string"
		|| !/^\d+\.\d+\.\d+$/.test(manifest.versionName)
		|| typeof manifest.apkUrl !== "string"
		|| !manifest.apkUrl.startsWith("/")
		|| manifest.apkUrl.startsWith("//")
		|| typeof manifest.signingCertificateSha256 !== "string"
		|| !normalizeCertificateSha256(manifest.signingCertificateSha256)
		|| typeof manifest.releaseNotes !== "string"
		|| manifest.releaseNotes.length > 500) return null

	try {
		const apkUrl = new URL(manifest.apkUrl, channelConfig.origin)
		if (apkUrl.origin !== channelConfig.origin
			|| apkUrl.pathname !== channelConfig.apkPath
			|| apkUrl.username
			|| apkUrl.password
			|| apkUrl.hash) return null
	} catch {
		return null
	}

	return {
		enabled: true,
		channel,
		applicationId: "com.nurava.hubstores",
		versionCode: manifest.versionCode as number,
		versionName: manifest.versionName,
		apkUrl: manifest.apkUrl,
		signingCertificateSha256: normalizeCertificateSha256(manifest.signingCertificateSha256)!,
		releaseNotes: manifest.releaseNotes,
	}
}
