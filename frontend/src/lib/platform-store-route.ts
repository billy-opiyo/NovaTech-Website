export const PLATFORM_STORE_COOKIE = "nurava-platform-store"
export const PLATFORM_STORE_PREFIX = "/store/"

export function isValidStoreSlug(value: string | null | undefined): value is string {
	return Boolean(value && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) && value.length <= 63)
}
