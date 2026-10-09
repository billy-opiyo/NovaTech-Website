import { clientConfig } from "@/config/client.config"

export type PlatformTeamMember = {
	id: string
	name: string
	role: string
	bio: string
	image?: string
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
			tagline: clientConfig.brand.tagline,
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
		seo: { ...clientConfig.seo },
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
		},
		discoveryCards: {
			businesses: { title: "For Businesses", text: "Create, Manage and Grow your Online Store" },
			customers: { title: "For Customers", text: "Discover products from trusted businesses" },
			compare: { title: "Compare", text: "Compare prices, offers and store ratings." },
			choose: { title: "Choose", text: "Select the best store that suits you." },
			buyFromStore: { title: "Buy from Store", text: "Complete your purchase directly on the store's site." },
		},
		design: { themePreset: "nova-blue-orange" },
		legal: {
			terms: "Nurava HubStores provides the platform that helps independent merchants publish storefronts and connect with shoppers. Each merchant remains responsible for its products, prices, availability, delivery, payment terms, refunds, warranties, taxes, and customer support.",
			privacy: "Nurava HubStores processes platform account and operational information to provide hosting, authentication, support, and merchant tools. Merchants are responsible for the shopper information they collect and how they use it in their own store.",
			cookies: "Nurava HubStores uses necessary cookies and local storage for authentication, security, preferences, cart continuity, and platform performance. Optional analytics or marketing technologies should only be enabled where properly disclosed and permitted.",
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
	const hero = {
		title: nonBlank(patch.hero?.title, nonBlank(base.hero?.title, defaults.title!)),
		highlight: nonBlank(patch.hero?.highlight, nonBlank(base.hero?.highlight, defaults.highlight!)),
		description: nonBlank(patch.hero?.description, nonBlank(base.hero?.description, defaults.description!)),
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
		brand: { ...base.brand, ...patch.brand },
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
		legal: { ...base.legal, ...patch.legal },
	}
	// Normalize older platform-owned copy in memory. Merchant storefront settings
	// and demo-store records are loaded through a separate context.
	const rebrand = (value: unknown): unknown => {
		if (typeof value === "string") return value.replaceAll("Nurava Tech", "Nurava HubStores")
		if (Array.isArray(value)) return value.map(rebrand)
		if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rebrand(item)]))
		return value
	}
	return rebrand(merged) as PlatformSiteSettings
}
