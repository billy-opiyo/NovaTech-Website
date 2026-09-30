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
		showProgress?: boolean
		welcomeText?: string
		loadingText?: string
		images?: PlatformResponsiveAssets
	}
	hero?: {
		title?: string
		highlight?: string
		description?: string
		images?: PlatformResponsiveAssets
	}
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
			whatsappFloatingMessage: "Hello Nurava Tech, I am a merchant and would like to learn more about creating a store on the platform.",
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
			showProgress: true,
			welcomeText: "Welcome to",
			loadingText: "Preparing your store",
			images: {
				darkDesktop: "/images/NovaTech cover desktop.png",
				darkTablet: "/images/NovaTech cover mobile.png",
				darkMobile: "/images/NovaTech cover mobile.png",
				lightDesktop: "/images/NovaTech cover desktop light.png",
				lightTablet: "/images/NovaTech cover mobile light.png",
				lightMobile: "/images/NovaTech cover mobile light.png",
			},
		},
		design: { themePreset: "nova-blue-orange" },
		legal: {
			terms: "Nurava Tech provides the platform that helps independent merchants publish storefronts and connect with shoppers. Each merchant remains responsible for its products, prices, availability, delivery, payment terms, refunds, warranties, taxes, and customer support.",
			privacy: "Nurava Tech processes platform account and operational information to provide hosting, authentication, support, and merchant tools. Merchants are responsible for the shopper information they collect and how they use it in their own store.",
			cookies: "Nurava Tech uses necessary cookies and local storage for authentication, security, preferences, cart continuity, and platform performance. Optional analytics or marketing technologies should only be enabled where properly disclosed and permitted.",
		},
		team: [
			{
				id: "founder-developer",
				name: "Nurava Tech Founder",
				role: "Founder & Developer",
				bio: "Leads the product vision and builds the technology that helps independent stores serve shoppers better.",
			},
			{
				id: "platform-operations",
				name: "Nurava Tech Operations",
				role: "Platform Operations",
				bio: "Keeps the platform reliable and coordinates the systems that support merchants and shoppers.",
			},
			{
				id: "merchant-success",
				name: "Nurava Tech Team",
				role: "Merchant Success",
				bio: "Helps store partners present their products clearly and grow with dependable storefront tools.",
			},
		],
	}
}

export function mergePlatformSiteSettings(base: PlatformSiteSettings, patch: PlatformSiteSettings): PlatformSiteSettings {
	// Ignore the retired hero customizations while continuing to parse older saved
	// records safely; the platform homepage hero now uses its original artwork.
	const safeBase = { ...base }
	const safePatch = { ...patch }
	delete safeBase.hero
	delete safePatch.hero
	const contact = { ...base.contact, ...patch.contact }
	// Before the dedicated field existed, the platform settings screen stored
	// this value as whatsappMessage. Treat it as the floating/social message so
	// existing saved settings continue to work without changing Contact-page chat.
	if (patch.contact?.whatsappFloatingMessage === undefined && patch.contact?.whatsappMessage !== undefined) {
		contact.whatsappFloatingMessage = patch.contact.whatsappMessage
	}
	return {
		...safeBase,
		...safePatch,
		brand: { ...base.brand, ...patch.brand },
		site: { ...base.site, ...patch.site },
		contact,
		social: { ...base.social, ...patch.social },
		seo: { ...base.seo, ...patch.seo },
		features: { ...base.features, ...patch.features },
		splash: { ...base.splash, ...patch.splash, images: { ...base.splash?.images, ...patch.splash?.images } },
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
}
