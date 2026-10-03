import type { ClientConfig } from "@/config/client.config"
import type { PlatformSiteSettings, PlatformTeamMember } from "./platform-site-settings"
import type { PlatformThemeOverrides } from "@/config/theme-presets"

export type StoreContext = Omit<ClientConfig, "homepage"> & {
	homepage: Omit<ClientConfig["homepage"], "categories"> & {
		categories: Array<{ name: string; slug: string; image: string }>
		heroImage?: string
		heroImageAlt?: string
	}
	tenantId: string
	storeId: string
	storeSlug: string
	industry: { id: string; name: string; slug: string } | null
	/** URL prefix used when this store is reached through the platform host. */
	storePathPrefix: string
	publicationStatus: "DRAFT" | "PUBLISHED" | "SUSPENDED"
	isPlatformHome: boolean
	platformTeam: PlatformTeamMember[]
	platformSettings?: PlatformSiteSettings
	themeOverrides?: PlatformThemeOverrides
	themeLayout?: { heroLayout?: string; bannerStyle?: string; productGridStyle?: string }
	legal: {
		terms: string
		privacy: string
		cookies: string
	}
}
