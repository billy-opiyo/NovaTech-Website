import type { ThemePresetId } from "./theme-presets"

/**
 * The only file intended to be edited when deploying this storefront for a
 * new client. Do not put secrets here; use environment variables for those.
 */
export const clientConfig = {
	brand: {
		name: "NovaTech Store",
		shortName: "NovaTech",
		logo: "/images/NovaTech icon.png",
		logoAlt: "NovaTech Store logo",
		favicon: "/favicon.ico",
		tagline: "Kenya's trusted electronics store",
	},
	site: {
		url: "https://novatechstore.co.ke",
		locale: "en_KE",
		language: "en",
		country: "Kenya",
		currency: "KES",
	},
	contact: {
		phoneDisplay: "+254 700 123 456",
		phoneHref: "tel:+254700123456",
		email: "support@novatechstore.co.ke",
		emailHref: "mailto:support@novatechstore.co.ke",
		whatsappNumber: "254700000000",
		whatsappMessage: "Hello NovaTech Store, I need help with my order.",
		addressLine: "Kimathi Street, CBD",
		cityCountry: "Nairobi, Kenya",
		businessHours: "Mon - Sat, 8AM - 6PM",
		responseTime: "We reply within 24 hours",
	},
	seo: {
		description: "Shop genuine phones, laptops, and accessories with warranty and fast delivery across Kenya.",
		keywords: "electronics, Kenya, phones, laptops, accessories, M-Pesa, online shopping",
	},
	// Change this value to one of the IDs in theme-presets.ts for another visual system.
	themePreset: "nova-blue-orange" as ThemePresetId,
	navigation: [
		{ name: "Home", href: "/" },
		{ name: "Phones", href: "/category/phones" },
		{ name: "Laptops", href: "/category/laptops" },
		{ name: "Accessories", href: "/category/accessories" },
		{ name: "Deals", href: "/deals" },
	],
	social: {
		facebook: "https://facebook.com",
		instagram: "https://instagram.com",
		tiktok: "https://tiktok.com",
	},
	homepage: {
		heroTitle: "Upgrade Your Tech",
		heroHighlight: "With Genuine Deals",
		heroDescription: "Shop the latest phones, laptops, and accessories with warranty and fast delivery.",
		heroPrimaryLabel: "Shop Phones",
		heroPrimaryHref: "/category/phones",
		heroSecondaryLabel: "Today's Deals",
		heroSecondaryHref: "/deals",
		categoryTitle: "Shop by Category",
		newsletterTitle: "Stay Updated",
		newsletterDescription: "Get exclusive deals and new arrivals straight to your inbox.",
	},
	ecommerce: {
		freeShippingThreshold: 50000,
		defaultShippingCost: 500,
	},
	features: {
		showSplashScreen: true,
		showWhatsAppButton: true,
		showNewsletter: true,
	},
} as const

export type ClientConfig = typeof clientConfig

export const getWhatsAppHref = () =>
	`https://wa.me/${clientConfig.contact.whatsappNumber}?text=${encodeURIComponent(clientConfig.contact.whatsappMessage)}`
