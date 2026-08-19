import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest, TenantResolutionError } from "backend/lib/tenant"
import { clientConfig } from "@/config/client.config"
import type { StoreContext } from "./store-context.types"

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

function isLocalPreviewHost(value: string | null): boolean {
	if (!value) return false
	const hostname = value.trim().toLowerCase().split(":")[0]
	return hostname === "localhost" || hostname === "127.0.0.1"
}

function isPlatformHost(value: string | null): boolean {
	if (!value) return false
	const hostname = value.trim().toLowerCase().split(":")[0]
	const platformDomain = (process.env.PLATFORM_DOMAIN || "novatechstore.co.ke").replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()
	return isLocalPreviewHost(value) || hostname === platformDomain
}

export async function getStoreContext(): Promise<StoreContext> {
	const requestHeaders = await headers()
	const platformHome = isPlatformHost(requestHeaders.get("host"))
	if (process.env.NODE_ENV !== "production" && isLocalPreviewHost(requestHeaders.get("host"))) {
		return fallbackStoreContext(true)
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
		const homepage = record(store.homepageSettings)
		const commerce = record(store.commerceSettings)
		return {
			...fallbackStoreContext(),
			tenantId: store.tenantId,
			storeId: store.id,
			storeSlug: store.slug,
			publicationStatus: store.publicationStatus,
			brand: { ...clientConfig.brand, name: store.name, ...(store.logoUrl ? { logo: store.logoUrl } : {}), ...(store.faviconUrl ? { favicon: store.faviconUrl } : {}) },
			site: { ...clientConfig.site, locale: store.defaultLocale.replace("-", "_"), currency: store.currency, country: store.country },
			themePreset: typeof theme.preset === "string" ? theme.preset as StoreContext["themePreset"] : clientConfig.themePreset,
			seo: { ...clientConfig.seo, ...seo },
			contact: { ...clientConfig.contact, ...contact },
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

export function fallbackStoreContext(isPlatformHome = false): StoreContext {
	return {
		...clientConfig,
		tenantId: "novatech-tenant",
		storeId: "novatech-store",
		storeSlug: "novatech",
		publicationStatus: "PUBLISHED",
		isPlatformHome,
	} as unknown as StoreContext
}
