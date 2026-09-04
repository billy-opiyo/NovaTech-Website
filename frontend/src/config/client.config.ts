import type { ThemePresetId } from "./theme-presets"

/**
 * The only file intended to be edited when deploying this storefront for a
 * new client. Do not put secrets here; use environment variables for those.
 */
export const clientConfig = {
	brand: {
		name: "Nurava Tech",
		shortName: "Nurava",
		logo: "/images/NovaTech icon.png",
		logoAlt: "Nurava Tech logo",
		favicon: "/images/NovaTech%20icon.png",
		tagline: "Kenya's trusted electronics store",
	},
	site: {
		url: "https://nuravatech.com",
		locale: "en_KE",
		language: "en",
		country: "Kenya",
		currency: "KES",
		footerDescription: "A trusted technology marketplace connecting shoppers with independent Kenyan stores.",
	},
	contact: {
		phoneDisplay: "+254 700 123 456",
		phoneHref: "tel:+254700123456",
		email: "support@nuravatech.com",
		emailHref: "mailto:support@nuravatech.com",
		whatsappNumber: "254740470381",
		// Storefront floating/social message. Platform defaults are supplied by
		// platform-site-settings.ts; this fallback is for merchant storefronts.
		whatsappFloatingMessage: "Hello Nurava Tech, I need help with my order.",
		whatsappMessage: "Hello Nurava Tech, I need help with my order.",
		addressLine: "Kimathi Street, CBD",
		cityCountry: "Nairobi, Kenya",
		businessHours: "Mon - Sat, 8AM - 6PM",
		responseTime: "We reply within 24 hours",
		mapEmbedUrl: "https://www.google.com/maps?q=Kimathi+Street,+CBD,+Nairobi,+Kenya&output=embed",
		mapLink: "https://www.google.com/maps/search/?api=1&query=Kimathi+Street,+CBD,+Nairobi,+Kenya",
	},
	seo: {
		title: "",
		description: "Shop genuine phones, laptops, and accessories with warranty and fast delivery across Kenya.",
		keywords: "electronics, Kenya, phones, laptops, accessories, M-Pesa, online shopping",
		ogImage: "",
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
		linkedin: "",
		youtube: "",
		x: "",
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
		categories: [
			{ name: "Phones", slug: "phones", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80" },
			{ name: "Laptops", slug: "laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80" },
			{ name: "Tablets", slug: "tablets", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80" },
			{ name: "Accessories", slug: "accessories", image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80" },
		],
		featuredProducts: [
			{ id: "iphone-15-pro-max", name: "iPhone 15 Pro Max", price: 159999, discountedPrice: 149999, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=80", rating: 4.8 },
			{ id: "samsung-galaxy-s24-ultra", name: "Samsung Galaxy S24 Ultra", price: 134999, image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=700&q=80", rating: 4.7 },
			{ id: "macbook-air-m3", name: "MacBook Air M3", price: 189999, discountedPrice: 174999, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=80", rating: 4.9 },
			{ id: "sony-wh-1000xm5", name: "Sony WH-1000XM5", price: 34999, image: "https://images.unsplash.com/photo-1512499617640-c2f9993581af?auto=format&fit=crop&w=700&q=80", rating: 4.6 },
		],
		testimonials: [
			{ name: "Jane M.", text: "Great service, genuine products. My laptop arrived in 2 days!", role: "Customer" },
			{ name: "Brian K.", text: "Best electronics shop in Nairobi. Highly recommended.", role: "Customer" },
		],
	},
	ecommerce: {
		freeShippingThreshold: 50000,
		defaultShippingCost: 500,
	},
	features: {
		showSplashScreen: true,
		showWhatsAppButton: true,
		showWhatsAppContact: true,
		showSocialLinks: true,
		showContactCards: true,
		showNewsletter: true,
	},
} as const

export type ClientConfig = typeof clientConfig

export const getWhatsAppHref = () =>
	`https://wa.me/${clientConfig.contact.whatsappNumber}?text=${encodeURIComponent(clientConfig.contact.whatsappMessage)}`
