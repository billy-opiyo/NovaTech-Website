import { revalidateTag } from "next/cache"

export const PUBLISHED_PLATFORM_SETTINGS_TAG = "published-platform-site-settings"

export function revalidatePlatformSettingsCache() {
	revalidateTag(PUBLISHED_PLATFORM_SETTINGS_TAG)
}
