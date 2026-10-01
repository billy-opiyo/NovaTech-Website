export const PLATFORM_STORE_COOKIE = "nurava-platform-store"
export const PLATFORM_STORE_PREFIX = "/store/"

export function isValidStoreSlug(value: string | null | undefined): value is string {
	return Boolean(value && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) && value.length <= 63)
}

export function isVercelProjectHostname(hostname: string) {
	return hostname === "vercel.app" || hostname.endsWith(".vercel.app")
}

export function resolveDirectoryStoreLogo(slug: string, logoUrl: string | null, platformStoreLogo: string): string | null {
	const configuredLogo = logoUrl?.trim()
	if (configuredLogo) return configuredLogo
	return slug.trim().toLowerCase() === "nuravatech" ? platformStoreLogo : null
}

export function getStorePublicHref(slug: string, host: string, platformDomain: string): string {
	const normalizedHost = host.trim().toLowerCase()
	const hostname = normalizedHost.split(":")[0]
	const port = normalizedHost.includes(":") ? `:${normalizedHost.split(":").pop()}` : ""
	if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
		return `http://${slug}.localhost${port}`
	}
	if (isVercelProjectHostname(hostname)) {
		return `https://${hostname}${PLATFORM_STORE_PREFIX}${encodeURIComponent(slug)}`
	}
	return `https://${slug}.${platformDomain}`
}
