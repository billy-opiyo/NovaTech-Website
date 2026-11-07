import type { ClientConfig } from "@/config/client.config"
import type { PlatformDesignSettings, PlatformSiteSettings, PlatformTeamMember } from "./platform-site-settings"
import type { PlatformThemeOverrides } from "@/config/theme-presets"

export type StoreContext = Omit<ClientConfig, "homepage"> & {
	homepage: Omit<ClientConfig["homepage"], "categories"> & {
		categories: Array<{ name: string; slug: string; image: string }>
		footerDescription?: string
		heroImage?: string
	}
	tenantId: string
	storeId: string
	storeSlug: string
	ownerType: "MERCHANT" | "PLATFORM"
	/** Configurable platform name. Empty in merchant storefront contexts. */
	platformBrandName: string
	industry: { id: string; name: string; slug: string } | null
	/** URL prefix used when this store is reached through the platform host. */
	storePathPrefix: string
	publicationStatus: "DRAFT" | "PUBLISHED" | "SUSPENDED"
	isPlatformHome: boolean
	platformTeam: PlatformTeamMember[]
	platformSettings?: PlatformSiteSettings
	/** Published platform design inherited by the platform-owned storefront. */
	platformTheme?: PlatformDesignSettings
	themeOverrides?: PlatformThemeOverrides
	themeLayout?: { heroLayout?: string; bannerStyle?: string; productGridStyle?: string }
	legal: {
		terms: string
		privacy: string
		cookies: string
	}
}
