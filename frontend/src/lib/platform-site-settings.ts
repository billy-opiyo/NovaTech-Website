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
	const contact = { ...base.contact, ...patch.contact }
	// Before the dedicated field existed, the platform settings screen stored
	// this value as whatsappMessage. Treat it as the floating/social message so
	// existing saved settings continue to work without changing Contact-page chat.
	if (patch.contact?.whatsappFloatingMessage === undefined && patch.contact?.whatsappMessage !== undefined) {
		contact.whatsappFloatingMessage = patch.contact.whatsappMessage
	}
	return {
		...base,
		...patch,
		brand: { ...base.brand, ...patch.brand },
		site: { ...base.site, ...patch.site },
		contact,
		social: { ...base.social, ...patch.social },
		seo: { ...base.seo, ...patch.seo },
		features: { ...base.features, ...patch.features },
	}
}
