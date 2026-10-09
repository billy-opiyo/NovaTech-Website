import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { getRequestedStoreSlug, resolveTenantFromRequest, TenantResolutionError } from "backend/lib/tenant"
import { getPlatformDomain } from "backend/lib/platform-domain"
import { clientConfig } from "@/config/client.config"
import { platformSiteSettingsPatchSchema } from "backend/validators/platformSiteSettingsValidator"
import type { StoreContext } from "./store-context.types"
import { getPlatformSiteSettingsDefaults, mergePlatformSiteSettings, type PlatformSiteSettings } from "./platform-site-settings"
import { isVercelProjectHostname } from "./platform-store-route"
import { defaultCategoryImage, defaultIndustryHomepage } from "backend/lib/industry-content"
import { themeOverridesFromIndustry } from "./industry-theme"
import { resolveStoreWhatsAppNumber } from "./demo-store-config"

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

// Merchant storefronts must not inherit Nurava platform contact details when
// a merchant has not configured its own public contact information yet.
const merchantContactDefaults = {
	phoneDisplay: "",
	phoneHref: "",
	email: "",
	emailHref: "",
	whatsappNumber: "",
	whatsappFloatingMessage: "",
	whatsappMessage: "",
	addressLine: "",
	cityCountry: "",
	businessHours: "",
	responseTime: "",
	mapEmbedUrl: "",
	mapLink: "",
}

const merchantSocialDefaults = {
	facebook: "",
	instagram: "",
	tiktok: "",
	linkedin: "",
	youtube: "",
	x: "",
}

function merchantLegalDefaults(storeName: string) {
	return {
		terms: `This store is operated by ${storeName}. Product availability, prices, delivery, payment arrangements, returns, refunds, warranties, taxes, and customer support are handled by the merchant. Please contact the store directly before or after a purchase if you need help.`,
		privacy: `${storeName} uses information you provide to respond to enquiries, arrange purchases and delivery, provide support, protect accounts, and communicate about store services. Contact the merchant directly to ask about access, correction, or deletion of your shopper information.`,
		cookies: `${storeName} uses necessary browser storage for authentication, security, shopping sessions, saved preferences, and reliable storefront operation. You can manage optional storage through your browser settings.`,
	}
}

async function getPublishedPlatformSettings(): Promise<PlatformSiteSettings> {
	try {
		const settings = await prisma.platformSiteSettings.findUnique({ where: { id: "platform" }, select: { publishedSettings: true } })
		const parsed = platformSiteSettingsPatchSchema.safeParse(settings?.publishedSettings ?? {})
		return parsed.success ? parsed.data : {}
	} catch (error) {
		console.error("Platform site settings unavailable; using configured defaults", error)
		return {}
	}
}

function isLocalPreviewHost(value: string | null): boolean {
	if (!value) return false
	const hostname = value.trim().toLowerCase().split(":")[0]
	return hostname === "localhost" || hostname === "127.0.0.1"
}

function isPlatformHost(value: string | null): boolean {
	if (!value) return false
	const hostname = value.trim().toLowerCase().split(":")[0]
	const platformDomain = getPlatformDomain()
	return isLocalPreviewHost(value) || isVercelProjectHostname(hostname) || hostname === platformDomain || hostname === `www.${platformDomain}`
}

export async function getStoreContext(): Promise<StoreContext> {
	const requestHeaders = await headers()
	const requestedStoreSlug = getRequestedStoreSlug(requestHeaders)
	const platformHome = isPlatformHost(requestHeaders.get("host")) && !requestedStoreSlug
	if (platformHome) {
		// Platform discovery is independent of any merchant domain mapping. Keep
		// the root host on platform defaults; the homepage loads its store
		// directory separately and never inherits a merchant storefront context.
		return fallbackStoreContext(true, await getPublishedPlatformSettings())
	}

	try {
		// A suspended public store must resolve far enough to render a privacy-safe
		// contact blocker instead of falling through to the platform 404 page.
		const requestContext = await resolveTenantFromRequest({ headers: requestHeaders }, { allowSuspended: true })
		const store = await prisma.store.findUnique({
			where: { id: requestContext.storeId },
			select: {
				id: true,
				tenantId: true,
				name: true,
				slug: true,
				publicationStatus: true,
				defaultLocale: true,
				currency: true,
				country: true,
				logoUrl: true,
				faviconUrl: true,
				themeSettings: true,
				seoSettings: true,
				contactSettings: true,
				homepageSettings: true,
				commerceSettings: true,
				industry: { select: { id: true, name: true, slug: true, homepagePreset: true, categoryTemplates: { where: { active: true }, orderBy: { displayOrder: "asc" }, select: { name: true, slug: true, imageUrl: true } }, defaultTheme: { select: { colors: true, typography: true, heroLayout: true, bannerStyle: true, productGridStyle: true } } } },
			},
		})
		if (!store) return fallbackStoreContext(platformHome)

		const theme = record(store.themeSettings)
		const themeSnapshot = record(theme.themeSnapshot)
		const effectiveTheme = themeSnapshot.colors && themeSnapshot.typography
			? { colors: themeSnapshot.colors, typography: themeSnapshot.typography, heroLayout: themeSnapshot.heroLayout, bannerStyle: themeSnapshot.bannerStyle, productGridStyle: themeSnapshot.productGridStyle }
			: store.industry?.defaultTheme
		const seo = record(store.seoSettings)
		const contact = record(store.contactSettings)
		const socialSettings = record(contact.social)
		const storedHomepage = record(store.homepageSettings)
		const industryHomepage = defaultIndustryHomepage(store.industry || { name: "Store", slug: "store" }, store.industry?.homepagePreset)
		const homepageDefaults: Record<string, unknown> = store.industry?.slug === "electronics" ? clientConfig.homepage : {
			...clientConfig.homepage,
			...industryHomepage,
			aboutTitle: `About ${store.name}`,
			aboutDescription: `${store.name} is an independent ${store.industry?.name.toLowerCase() || "retail"} store. Contact the store directly for product details, availability, orders, delivery, and support.`,
			categories: [],
			featuredProducts: [],
			testimonials: [],
			newsletterTitle: `Updates from ${store.name}`,
			newsletterDescription: `Sign up for occasional updates about new arrivals, offers, and news from ${store.name}.`,
		}
		const homepage: Record<string, unknown> = { ...homepageDefaults, ...(store.industry?.slug === "electronics" ? {} : industryHomepage), ...storedHomepage }
		delete homepage.heroImage
		delete homepage.heroImageAlt
		const legalSettings = record(homepage.legal)
		const categoryImages = record(homepage.categoryImages)
		const commerce = record(store.commerceSettings)
		const categoryAvailability = record(commerce.categoryAvailability)
		const industryCategories = store.industry?.categoryTemplates || []
		const storedCategorySnapshots = Array.isArray(storedHomepage.categories) ? storedHomepage.categories.flatMap((value) => {
			const category = record(value)
			if (typeof category.name !== "string" || typeof category.slug !== "string") return []
			return [{ name: category.name, slug: category.slug, image: typeof category.image === "string" ? category.image : typeof category.imageUrl === "string" ? category.imageUrl : "" }]
		}) : []
		const nonElectronicsIndustry = store.industry?.slug !== "electronics"
		const electronicsCategorySlugs = new Set<string>(clientConfig.homepage.categories.map((category) => category.slug))
		const persistedCategories = nonElectronicsIndustry
			? (() => {
				const storedBySlug = new Map(storedCategorySnapshots.map((category) => [category.slug, category]))
				const configuredCategories = industryCategories.map((category) => ({
					name: category.name,
					slug: category.slug,
					image: defaultCategoryImage(store.industry?.slug || "", category.name, category.imageUrl || storedBySlug.get(category.slug)?.image),
				}))
				const templateSlugs = new Set(industryCategories.map((category) => category.slug))
				const customCategories = storedCategorySnapshots
					.filter((category) => !templateSlugs.has(category.slug) && !electronicsCategorySlugs.has(category.slug))
					.map((category) => ({ ...category, image: defaultCategoryImage(store.industry?.slug || "", category.name, category.image) }))
				return [...configuredCategories, ...customCategories]
			})()
			: storedCategorySnapshots.length
				? storedCategorySnapshots.map((category) => {
					const categoryTemplate = industryCategories.find((item) => item.slug === category.slug)
					const fallback = clientConfig.homepage.categories.find((item) => item.slug === category.slug)
					const configuredImage = category.image || categoryTemplate?.imageUrl || fallback?.image

					return { ...category, image: defaultCategoryImage(store.industry?.slug || "", category.name, configuredImage) }
				})
				: store.industry?.slug === "electronics"
					? clientConfig.homepage.categories
					: industryCategories.map((category) => ({ name: category.name, slug: category.slug, image: defaultCategoryImage(store.industry?.slug || "", category.name, category.imageUrl) }))
		const categories = persistedCategories.filter((category) => categoryAvailability[category.slug] !== false).map((category) => {
			const configuredImage = categoryImages[category.slug]
			return typeof configuredImage === "string" && configuredImage.trim()
				? { ...category, image: configuredImage }
				: category
		})
		const defaultNavigation: Array<{ name: string; href: string }> = store.industry?.slug && store.industry.slug !== "electronics"
			? [{ name: "Home", href: "/" }, ...categories.map((category) => ({ name: category.name, href: `/category/${category.slug}` })), { name: "All Products", href: "/products" }]
			: [...clientConfig.navigation]
		const configuredNavigation: Array<{ name: string; href: string }> = Array.isArray(storedHomepage.navigation) ? storedHomepage.navigation.flatMap((value: unknown) => {
			const link = record(value)
			return typeof link.name === "string" && typeof link.href === "string" ? [{ name: link.name, href: link.href }] : []
		}) : defaultNavigation
		const navigation = configuredNavigation.filter((link) => {
			const categorySlug = link.href.match(/^\/category\/([^/?#]+)/)?.[1]
			return !categorySlug || (categories.some((category) => category.slug === categorySlug) && categoryAvailability[categorySlug] !== false)
		})
		const configuredHeroHref = typeof homepage.heroPrimaryHref === "string" ? homepage.heroPrimaryHref : clientConfig.homepage.heroPrimaryHref
		const hiddenHeroCategory = configuredHeroHref.match(/^\/category\/([^/?#]+)/)?.[1]
		const heroPrimaryHref = hiddenHeroCategory && categoryAvailability[hiddenHeroCategory] === false
			? categories[0] ? `/category/${categories[0].slug}` : "/products"
			: configuredHeroHref
		const phoneDisplay = typeof contact.phoneDisplay === "string" ? contact.phoneDisplay : merchantContactDefaults.phoneDisplay
		const email = typeof contact.email === "string" ? contact.email : merchantContactDefaults.email
		const addressLine = typeof contact.addressLine === "string" ? contact.addressLine : merchantContactDefaults.addressLine
		const cityCountry = typeof contact.cityCountry === "string" ? contact.cityCountry : merchantContactDefaults.cityCountry
		const locationQuery = [addressLine, cityCountry].filter(Boolean).join(", ")
		const customLocation = contact.addressLine !== undefined || contact.cityCountry !== undefined
		const configuredMapLink = typeof contact.mapLink === "string" ? contact.mapLink : null
		const configuredMapEmbedUrl = typeof contact.mapEmbedUrl === "string" ? contact.mapEmbedUrl : null
		const mapLink = configuredMapLink !== null
			? configuredMapLink
			: customLocation && locationQuery
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
			: merchantContactDefaults.mapLink
		const mapEmbedUrl = configuredMapEmbedUrl !== null
			? configuredMapEmbedUrl
			: customLocation && locationQuery
			? `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`
			: merchantContactDefaults.mapEmbedUrl
		const whatsappFloatingMessage = typeof contact.whatsappFloatingMessage === "string"
			? contact.whatsappFloatingMessage
			: `Hello ${store.name}, I need help with my order.`
		const whatsappMessage = `Hello ${store.name}, I need help with my order.`
		const configuredWhatsappNumber = resolveStoreWhatsAppNumber(store.slug, typeof contact.whatsappNumber === "string" ? contact.whatsappNumber : undefined)
		return {
			...fallbackStoreContext(),
			tenantId: store.tenantId,
			storeId: store.id,
			storeSlug: store.slug,
			industry: store.industry ? { id: store.industry.id, name: store.industry.name, slug: store.industry.slug } : null,
			storePathPrefix: isPlatformHost(requestHeaders.get("host")) ? `/store/${encodeURIComponent(store.slug)}` : "",
			publicationStatus: store.publicationStatus,
			themeOverrides: themeOverridesFromIndustry(effectiveTheme),
			themeLayout: effectiveTheme ? { heroLayout: typeof effectiveTheme.heroLayout === "string" ? effectiveTheme.heroLayout : undefined, bannerStyle: typeof effectiveTheme.bannerStyle === "string" ? effectiveTheme.bannerStyle : undefined, productGridStyle: typeof effectiveTheme.productGridStyle === "string" ? effectiveTheme.productGridStyle : undefined } : undefined,
			brand: { ...clientConfig.brand, name: store.name, ...(store.industry?.slug && store.industry.slug !== "electronics" ? { tagline: `Your trusted ${store.industry.name.toLowerCase()} store` } : {}), ...(store.logoUrl ? { logo: store.logoUrl } : {}), ...(store.faviconUrl ? { favicon: store.faviconUrl } : {}) },
			site: { ...clientConfig.site, locale: store.defaultLocale.replace("-", "_"), currency: store.currency, country: store.country },
			navigation,
			themePreset: typeof theme.preset === "string" ? theme.preset as StoreContext["themePreset"] : clientConfig.themePreset,
			seo: { ...clientConfig.seo, ...seo },
			contact: { ...merchantContactDefaults, ...contact, whatsappNumber: configuredWhatsappNumber, whatsappMessage, whatsappFloatingMessage, phoneDisplay, phoneHref: phoneDisplay ? `tel:${phoneDisplay.replace(/[^\d+]/g, "")}` : "", email, emailHref: email ? `mailto:${email}` : "", addressLine, cityCountry, mapLink, mapEmbedUrl },
			social: {
				...merchantSocialDefaults,
				facebook: typeof socialSettings.facebook === "string" ? socialSettings.facebook : merchantSocialDefaults.facebook,
				instagram: typeof socialSettings.instagram === "string" ? socialSettings.instagram : merchantSocialDefaults.instagram,
				tiktok: typeof socialSettings.tiktok === "string" ? socialSettings.tiktok : merchantSocialDefaults.tiktok,
			},
			homepage: { ...homepageDefaults, ...homepage, heroPrimaryHref, categories },
			ecommerce: { ...clientConfig.ecommerce, ...commerce },
			features: { ...clientConfig.features, ...record(theme.features) },
			legal: { ...merchantLegalDefaults(store.name), terms: typeof legalSettings.terms === "string" && legalSettings.terms.trim() ? legalSettings.terms : merchantLegalDefaults(store.name).terms, privacy: typeof legalSettings.privacy === "string" && legalSettings.privacy.trim() ? legalSettings.privacy : merchantLegalDefaults(store.name).privacy, cookies: typeof legalSettings.cookies === "string" && legalSettings.cookies.trim() ? legalSettings.cookies : merchantLegalDefaults(store.name).cookies },
			platformTeam: [],
			isPlatformHome: platformHome,
		} as unknown as StoreContext
	} catch (error) {
		if (process.env.NODE_ENV === "production" && error instanceof TenantResolutionError) throw error
		if (process.env.NODE_ENV !== "production") return fallbackStoreContext(platformHome)
		console.error("Store context unavailable", error)
		return fallbackStoreContext(platformHome)
	}
}

export function fallbackStoreContext(isPlatformHome = false, platformSettings: PlatformSiteSettings = {}): StoreContext {
	const mergedPlatformSettings = mergePlatformSiteSettings(getPlatformSiteSettingsDefaults(), platformSettings)
	const platformContact = { ...clientConfig.contact, ...mergedPlatformSettings.contact, whatsappMessage: clientConfig.contact.whatsappMessage }
	const platformPhone = platformContact.phoneDisplay || clientConfig.contact.phoneDisplay
	const platformEmail = platformContact.email || clientConfig.contact.email
	return {
		...clientConfig,
		industry: null,
		...(isPlatformHome ? {
			brand: { ...clientConfig.brand, ...mergedPlatformSettings.brand },
			site: { ...clientConfig.site, ...mergedPlatformSettings.site },
			contact: { ...platformContact, phoneDisplay: platformPhone, phoneHref: `tel:${platformPhone.replace(/[^\d+]/g, "")}`, email: platformEmail, emailHref: `mailto:${platformEmail}` },
			social: { ...clientConfig.social, ...mergedPlatformSettings.social },
			seo: { ...clientConfig.seo, ...mergedPlatformSettings.seo },
			features: { ...clientConfig.features, ...mergedPlatformSettings.features },
			themePreset: mergedPlatformSettings.design?.themePreset || clientConfig.themePreset,
			legal: mergedPlatformSettings.legal || {},
		} : { contact: merchantContactDefaults, social: merchantSocialDefaults }),
		platformTeam: isPlatformHome ? mergedPlatformSettings.team || [] : [],
		platformSettings: isPlatformHome ? mergedPlatformSettings : undefined,
		tenantId: "novatech-tenant",
		storeId: "novatech-store",
		storeSlug: "nuravatech",
		storePathPrefix: isPlatformHome ? "" : "/store/nuravatech",
		publicationStatus: "PUBLISHED",
		isPlatformHome,
	} as unknown as StoreContext
}
