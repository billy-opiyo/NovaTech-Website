export const DEFAULT_PLATFORM_DOMAIN = "nuravatech.com"

export function normalizePlatformDomain(value: string | null | undefined) {
	return (value || DEFAULT_PLATFORM_DOMAIN)
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.split(/[/:]/, 1)[0]
}

export function getPlatformDomain() {
	return normalizePlatformDomain(process.env.PLATFORM_DOMAIN)
}

export function getPublicAppUrl() {
	return (process.env.NEXT_PUBLIC_APP_URL || `https://${getPlatformDomain()}`).replace(/\/$/, "")
}
