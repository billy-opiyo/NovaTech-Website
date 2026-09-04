import { clientConfig } from "@/config/client.config"

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
	}
}

export function mergePlatformSiteSettings(base: PlatformSiteSettings, patch: PlatformSiteSettings): PlatformSiteSettings {
	return {
		...base,
		...patch,
		brand: { ...base.brand, ...patch.brand },
		site: { ...base.site, ...patch.site },
		contact: { ...base.contact, ...patch.contact },
		social: { ...base.social, ...patch.social },
		seo: { ...base.seo, ...patch.seo },
		features: { ...base.features, ...patch.features },
	}
}
