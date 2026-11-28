import { clientConfig } from "@/config/client.config"
import type { FontSizeOption } from "@/lib/font-size-preference"
import { DEFAULT_PLATFORM_COOKIES, DEFAULT_PLATFORM_PRIVACY, DEFAULT_PLATFORM_TERMS, LEGACY_PLATFORM_POLICY_DEFAULTS } from "@/lib/platform-policy-content"

export type PlatformTeamMember = {
	id: string
	name: string
	role: string
	bio: string
	image?: string
	website?: string
	social?: {
		linkedin?: string
		instagram?: string
		x?: string
		github?: string
	}
}

export type PlatformResponsiveAssets = {
	darkDesktop?: string
	darkTablet?: string
	darkMobile?: string
	lightDesktop?: string
	lightTablet?: string
	lightMobile?: string
}

export const PLATFORM_DISCOVERY_CARD_KEYS = ["businesses", "customers", "compare", "choose", "buyFromStore"] as const
export type PlatformDiscoveryCardKey = typeof PLATFORM_DISCOVERY_CARD_KEYS[number]
export type PlatformDiscoveryCardCopy = { title?: string; text?: string }
export const DEFAULT_PLATFORM_TAGLINE = "Where Merchants and Shoppers Connect"

export type PlatformDesignSettings = {
	themePreset?: string
	colors?: {
		primary?: string
		primaryDark?: string
		accent?: string
		light?: Partial<Record<"background" | "surface" | "text" | "muted" | "border", string>>
		dark?: Partial<Record<"background" | "surface" | "text" | "muted" | "border", string>>
	}
	typography?: {
		bodyFont?: "system" | "inter" | "georgia" | "trebuchet" | "verdana"
		headingFont?: "system" | "inter" | "georgia" | "trebuchet" | "verdana"
		fontSize?: FontSizeOption
	}
	glass?: {
		blurPx?: number
		cardRadiusPx?: number
		lightOpacity?: number
		darkOpacity?: number
		lightBorderOpacity?: number
		darkBorderOpacity?: number
		shadow?: "none" | "soft" | "balanced" | "bold"
	}
}

export type PlatformSiteSettings = {
	brand?: {
		name?: string
		tagline?: string
		logo?: string
		logoAlt?: string
		favicon?: string
	}
	site?: {
		footerDescription?: string
	}
	contact?: {
		phoneDisplay?: string
		email?: string
		whatsappNumber?: string
		whatsappFloatingMessage?: string
		/** Legacy setting retained so previously saved platform drafts remain readable. */
		whatsappMessage?: string
		addressLine?: string
		cityCountry?: string
		businessHours?: string
		responseTime?: string
	}
	social?: {
		facebook?: string
		instagram?: string
		tiktok?: string
		linkedin?: string
		youtube?: string
		x?: string
	}
	seo?: {
		title?: string
		description?: string
		keywords?: string
		ogImage?: string
	}
	features?: {
		showWhatsAppButton?: boolean
		showWhatsAppContact?: boolean
		showSocialLinks?: boolean
		showContactCards?: boolean
	}
	splash?: {
		enabled?: boolean
		showProgress?: boolean
		welcomeText?: string
		loadingText?: string
		logo?: string
		backgroundMode?: "images" | "color" | "glass"
		backgroundColor?: string
		centerContentOnColor?: boolean
		glassOpacity?: number
		images?: PlatformResponsiveAssets
	}
	hero?: {
		title?: string
		highlight?: string
		description?: string
		image?: string
		showTexts?: boolean
		/** Legacy values are accepted when reading saved settings but are never merged or rendered. */
		images?: PlatformResponsiveAssets
	}
	discoveryCards?: Partial<Record<PlatformDiscoveryCardKey, PlatformDiscoveryCardCopy>>
	design?: PlatformDesignSettings
	legal?: {
		terms?: string
		privacy?: string
		cookies?: string
	}
	team?: PlatformTeamMember[]
}

export function getPlatformSiteSettingsDefaults(): PlatformSiteSettings {
	return {
		brand: {
			name: clientConfig.brand.name,
			tagline: DEFAULT_PLATFORM_TAGLINE,
			logo: clientConfig.brand.logo,
			logoAlt: clientConfig.brand.logoAlt,
			favicon: clientConfig.brand.favicon,
		},
		site: { footerDescription: clientConfig.site.footerDescription },
		contact: {
			phoneDisplay: clientConfig.contact.phoneDisplay,
			email: clientConfig.contact.email,
			whatsappNumber: clientConfig.contact.whatsappNumber,
			whatsappFloatingMessage: "Hello Nurava HubStores, I am a merchant and would like to learn more about creating a store on the platform.",
			whatsappMessage: clientConfig.contact.whatsappMessage,
			addressLine: clientConfig.contact.addressLine,
			cityCountry: clientConfig.contact.cityCountry,
			businessHours: clientConfig.contact.businessHours,
			responseTime: clientConfig.contact.responseTime,
		},
		social: { ...clientConfig.social },
		seo: {
			title: "Nurava HubStores | Discover Stores & Shop Online",
			description: "Discover independent stores and shop across multiple industries with Nurava HubStores. Explore furniture, electronics, fashion, cakes and more while connecting directly with merchants.",
			keywords: "Nurava HubStores, online shopping Kenya, independent stores, multi-industry commerce, merchant storefronts, furniture stores, electronics stores, fashion stores, cake shops.",
			ogImage: "/images/nuravahubsoreslogo.png",
		},
		features: {
			showWhatsAppButton: clientConfig.features.showWhatsAppButton,
			showWhatsAppContact: clientConfig.features.showWhatsAppContact,
			showSocialLinks: clientConfig.features.showSocialLinks,
			showContactCards: clientConfig.features.showContactCards,
		},
		splash: {
			enabled: true,
			showProgress: true,
			welcomeText: "Welcome to",
			loadingText: "Preparing your store",
			backgroundMode: "glass",
			centerContentOnColor: true,
			images: {
				darkDesktop: "/images/NovaTech cover desktop.png",
				darkTablet: "/images/NovaTech cover mobile.png",
				darkMobile: "/images/NovaTech cover mobile.png",
				lightDesktop: "/images/NovaTech cover desktop light.png",
				lightTablet: "/images/NovaTech cover mobile light.png",
				lightMobile: "/images/NovaTech cover mobile light.png",
			},
		},
		hero: {
			title: "Nurava HubStores is the technology platform",
			highlight: "connecting you with trusted stores",
			description: "Discover stores, explore what they offer, and connect directly with independent merchants across Kenya.",
		showTexts: true,
		},
		discoveryCards: {
			businesses: { title: "For Businesses", text: "Create, Manage and Grow your Online Store" },
			customers: { title: "For Customers", text: "Discover products from trusted businesses" },
			compare: { title: "Compare", text: "Compare prices, offers and store ratings." },
			choose: { title: "Choose", text: "Select the best store that suits you." },
			buyFromStore: { title: "Buy from Store", text: "Complete your purchase directly on the store's site." },
		},
		design: { themePreset: "nova-blue-orange", typography: { fontSize: "normal" } },
		legal: {
			terms: DEFAULT_PLATFORM_TERMS,
			privacy: DEFAULT_PLATFORM_PRIVACY,
			cookies: DEFAULT_PLATFORM_COOKIES,
		},
		team: [
			{
				id: "founder-developer",
				name: "Nurava HubStores Founder",
				role: "Founder & Developer",
				bio: "Leads the product vision and builds the technology that helps independent stores serve shoppers better.",
			},
			{
				id: "platform-operations",
				name: "Nurava HubStores Operations",
				role: "Platform Operations",
				bio: "Keeps the platform reliable and coordinates the systems that support merchants and shoppers.",
			},
			{
				id: "merchant-success",
				name: "Nurava HubStores Team",
				role: "Merchant Success",
				bio: "Helps store partners present their products clearly and grow with dependable storefront tools.",
			},
		],
	}
}

export function mergePlatformSiteSettings(base: PlatformSiteSettings, patch: PlatformSiteSettings): PlatformSiteSettings {
	const safeBase = { ...base }
	const safePatch = { ...patch }
	delete safeBase.hero
	delete safePatch.hero
	const defaults = getPlatformSiteSettingsDefaults().hero!
	const nonBlank = (value: string | undefined, fallback: string) => value?.trim() || fallback
	const savedTagline = patch.brand?.tagline?.trim() || base.brand?.tagline?.trim()
	const tagline = !savedTagline || savedTagline === clientConfig.brand.tagline ? DEFAULT_PLATFORM_TAGLINE : savedTagline
	const hero = {
		title: nonBlank(patch.hero?.title, nonBlank(base.hero?.title, defaults.title!)),
		highlight: nonBlank(patch.hero?.highlight, nonBlank(base.hero?.highlight, defaults.highlight!)),
		description: nonBlank(patch.hero?.description, nonBlank(base.hero?.description, defaults.description!)),
		image: patch.hero?.image ?? base.hero?.image,
		showTexts: patch.hero?.showTexts ?? base.hero?.showTexts ?? true,
	}
	const defaultDiscoveryCards = getPlatformSiteSettingsDefaults().discoveryCards!
	const discoveryCards = Object.fromEntries(PLATFORM_DISCOVERY_CARD_KEYS.map((key) => {
		const fallback = defaultDiscoveryCards[key] ?? { title: "", text: "" }
		const copyValue = (patchValue: string | undefined, baseValue: string | undefined, defaultValue: string) =>
			patchValue === undefined ? nonBlank(baseValue, defaultValue) : nonBlank(patchValue, defaultValue)
		return [key, {
			title: copyValue(patch.discoveryCards?.[key]?.title, base.discoveryCards?.[key]?.title, fallback.title ?? ""),
			text: copyValue(patch.discoveryCards?.[key]?.text, base.discoveryCards?.[key]?.text, fallback.text ?? ""),
		}]
	})) as PlatformSiteSettings["discoveryCards"]
	const contact = { ...base.contact, ...patch.contact }
	// Before the dedicated field existed, the platform settings screen stored
	// this value as whatsappMessage. Treat it as the floating/social message so
	// existing saved settings continue to work without changing Contact-page chat.
	if (patch.contact?.whatsappFloatingMessage === undefined && patch.contact?.whatsappMessage !== undefined) {
		contact.whatsappFloatingMessage = patch.contact.whatsappMessage
	}
	const merged: PlatformSiteSettings = {
		...safeBase,
		...safePatch,
		brand: {
			...base.brand,
			...patch.brand,
			tagline,
		},
		site: { ...base.site, ...patch.site },
		contact,
		social: { ...base.social, ...patch.social },
		seo: { ...base.seo, ...patch.seo },
		features: { ...base.features, ...patch.features },
		splash: {
			...base.splash,
			...patch.splash,
			images: { ...base.splash?.images, ...patch.splash?.images },
		},
		hero,
		discoveryCards,
		design: {
			...base.design,
			...patch.design,
			colors: {
				...base.design?.colors,
				...patch.design?.colors,
				light: { ...base.design?.colors?.light, ...patch.design?.colors?.light },
				dark: { ...base.design?.colors?.dark, ...patch.design?.colors?.dark },
			},
			typography: { ...base.design?.typography, ...patch.design?.typography },
			glass: { ...base.design?.glass, ...patch.design?.glass },
		},
		legal: (() => {
			const defaults = getPlatformSiteSettingsDefaults().legal!
			const keys = ["terms", "privacy", "cookies"] as const
			return Object.fromEntries(keys.map((key) => {
				const saved = patch.legal?.[key] ?? base.legal?.[key]
				const value = typeof saved === "string" ? saved.trim() : ""
				const fallback = defaults[key] || ""
				return [key, !value || value === LEGACY_PLATFORM_POLICY_DEFAULTS[key] ? fallback : saved]
			})) as NonNullable<PlatformSiteSettings["legal"]>
		})(),
	}
	// Normalize platform-owned copy from prior names to the currently configured
	// name. Merchant storefront settings and demo-store records are separate.
	const platformName = merged.brand?.name?.trim() || clientConfig.brand.name
	const rebrand = (value: unknown): unknown => {
		if (typeof value === "string") return value.replace(/Nurava Tech|Nurava HubStores/g, platformName)
		if (Array.isArray(value)) return value.map(rebrand)
		if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rebrand(item)]))
		return value
	}
	return rebrand(merged) as PlatformSiteSettings
}
