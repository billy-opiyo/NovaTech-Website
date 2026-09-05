import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest, TenantResolutionError } from "backend/lib/tenant"
import { getPlatformDomain } from "backend/lib/platform-domain"
import { clientConfig } from "@/config/client.config"
import { platformSiteSettingsPatchSchema } from "backend/validators/platformSiteSettingsValidator"
import type { StoreContext } from "./store-context.types"
import { getPlatformSiteSettingsDefaults, mergePlatformSiteSettings, type PlatformSiteSettings } from "./platform-site-settings"
import { isVercelProjectHostname } from "./platform-store-route"

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
	const requestedStoreSlug = requestHeaders.get("x-nurava-store-slug")?.trim().toLowerCase() || ""
	const platformHome = isPlatformHost(requestHeaders.get("host")) && !requestedStoreSlug
	if (platformHome) {
		// Platform discovery is independent of any merchant domain mapping. Keep
		// the root host on platform defaults; the homepage loads its store
		// directory separately and never inherits a merchant storefront context.
		return fallbackStoreContext(true, await getPublishedPlatformSettings())
	}

	try {
		const requestContext = await resolveTenantFromRequest({ headers: requestHeaders })
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
			},
		})
		if (!store) return fallbackStoreContext(platformHome)

		const theme = record(store.themeSettings)
		const seo = record(store.seoSettings)
		const contact = record(store.contactSettings)
		const socialSettings = record(contact.social)
		const homepage = record(store.homepageSettings)
		const categoryImages = record(homepage.categoryImages)
		const commerce = record(store.commerceSettings)
		const categories = clientConfig.homepage.categories.map((category) => {
			const configuredImage = categoryImages[category.slug]
			return typeof configuredImage === "string" && configuredImage.trim()
				? { ...category, image: configuredImage }
				: category
		})
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
		return {
			...fallbackStoreContext(),
			tenantId: store.tenantId,
			storeId: store.id,
			storeSlug: store.slug,
			storePathPrefix: isPlatformHost(requestHeaders.get("host")) ? `/store/${encodeURIComponent(store.slug)}` : "",
			publicationStatus: store.publicationStatus,
			brand: { ...clientConfig.brand, name: store.name, ...(store.logoUrl ? { logo: store.logoUrl } : {}), ...(store.faviconUrl ? { favicon: store.faviconUrl } : {}) },
			site: { ...clientConfig.site, locale: store.defaultLocale.replace("-", "_"), currency: store.currency, country: store.country },
			themePreset: typeof theme.preset === "string" ? theme.preset as StoreContext["themePreset"] : clientConfig.themePreset,
			seo: { ...clientConfig.seo, ...seo },
			contact: { ...merchantContactDefaults, ...contact, whatsappMessage, whatsappFloatingMessage, phoneDisplay, phoneHref: phoneDisplay ? `tel:${phoneDisplay.replace(/[^\d+]/g, "")}` : "", email, emailHref: email ? `mailto:${email}` : "", addressLine, cityCountry, mapLink, mapEmbedUrl },
			social: {
				...merchantSocialDefaults,
				facebook: typeof socialSettings.facebook === "string" ? socialSettings.facebook : merchantSocialDefaults.facebook,
				instagram: typeof socialSettings.instagram === "string" ? socialSettings.instagram : merchantSocialDefaults.instagram,
				tiktok: typeof socialSettings.tiktok === "string" ? socialSettings.tiktok : merchantSocialDefaults.tiktok,
			},
			homepage: { ...clientConfig.homepage, ...homepage, categories },
			ecommerce: { ...clientConfig.ecommerce, ...commerce },
			features: { ...clientConfig.features, ...record(theme.features) },
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
		...(isPlatformHome ? {
			brand: { ...clientConfig.brand, ...mergedPlatformSettings.brand },
			site: { ...clientConfig.site, ...mergedPlatformSettings.site },
			contact: { ...platformContact, phoneDisplay: platformPhone, phoneHref: `tel:${platformPhone.replace(/[^\d+]/g, "")}`, email: platformEmail, emailHref: `mailto:${platformEmail}` },
			social: { ...clientConfig.social, ...mergedPlatformSettings.social },
			seo: { ...clientConfig.seo, ...mergedPlatformSettings.seo },
			features: { ...clientConfig.features, ...mergedPlatformSettings.features },
		} : { contact: merchantContactDefaults, social: merchantSocialDefaults }),
		platformTeam: isPlatformHome ? mergedPlatformSettings.team || [] : [],
		tenantId: "novatech-tenant",
		storeId: "novatech-store",
		storeSlug: "nuravatech",
		storePathPrefix: isPlatformHome ? "" : "/store/nuravatech",
		publicationStatus: "PUBLISHED",
		isPlatformHome,
	} as unknown as StoreContext
}
