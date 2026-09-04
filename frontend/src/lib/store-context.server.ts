import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest, TenantResolutionError } from "backend/lib/tenant"
import { getPlatformDomain } from "backend/lib/platform-domain"
import { clientConfig } from "@/config/client.config"
import { platformSiteSettingsPatchSchema } from "backend/validators/platformSiteSettingsValidator"
import type { StoreContext } from "./store-context.types"
import { getPlatformSiteSettingsDefaults, mergePlatformSiteSettings, type PlatformSiteSettings } from "./platform-site-settings"

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

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
	return isLocalPreviewHost(value) || hostname === platformDomain || hostname === `www.${platformDomain}`
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
		const commerce = record(store.commerceSettings)
		const phoneDisplay = typeof contact.phoneDisplay === "string" ? contact.phoneDisplay : clientConfig.contact.phoneDisplay
		const email = typeof contact.email === "string" ? contact.email : clientConfig.contact.email
		const addressLine = typeof contact.addressLine === "string" ? contact.addressLine : clientConfig.contact.addressLine
		const cityCountry = typeof contact.cityCountry === "string" ? contact.cityCountry : clientConfig.contact.cityCountry
		const locationQuery = [addressLine, cityCountry].filter(Boolean).join(", ")
		const customLocation = contact.addressLine !== undefined || contact.cityCountry !== undefined
		const mapLink = customLocation && locationQuery
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
			: clientConfig.contact.mapLink
		const mapEmbedUrl = customLocation && locationQuery
			? `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`
			: clientConfig.contact.mapEmbedUrl
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
			contact: { ...clientConfig.contact, ...contact, phoneDisplay, phoneHref: `tel:${phoneDisplay.replace(/[^\d+]/g, "")}`, email, emailHref: `mailto:${email}`, addressLine, cityCountry, mapLink, mapEmbedUrl },
			social: {
				...clientConfig.social,
				facebook: typeof socialSettings.facebook === "string" ? socialSettings.facebook : clientConfig.social.facebook,
				instagram: typeof socialSettings.instagram === "string" ? socialSettings.instagram : clientConfig.social.instagram,
				tiktok: typeof socialSettings.tiktok === "string" ? socialSettings.tiktok : clientConfig.social.tiktok,
			},
			homepage: { ...clientConfig.homepage, ...homepage },
			ecommerce: { ...clientConfig.ecommerce, ...commerce },
			features: { ...clientConfig.features, ...record(theme.features) },
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
	const platformContact = { ...clientConfig.contact, ...mergedPlatformSettings.contact }
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
		} : {}),
		tenantId: "novatech-tenant",
		storeId: "novatech-store",
		storeSlug: "nuravatech",
		storePathPrefix: isPlatformHome ? "" : "/store/nuravatech",
		publicationStatus: "PUBLISHED",
		isPlatformHome,
	} as unknown as StoreContext
}
