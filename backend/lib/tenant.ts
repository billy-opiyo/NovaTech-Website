import prisma from "./db"
import type { MerchantVerificationStatus } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import { getPlatformDomain } from "./platform-domain"
import { canMerchantSell } from "./merchant-verification"
import { isPlatformOwnedStore } from "./platform-store"

export const HIDDEN_STAGING_DEMO_STORE_SLUGS = ["nuravatech", "nurava-furnitures", "nurava-cakes", "nurava-boutiques"] as const

function isHiddenStagingDemoStore(slug: string): boolean {
	return (HIDDEN_STAGING_DEMO_STORE_SLUGS as readonly string[]).includes(slug)
}

export type TenantContext = {
	tenantId: string
	storeId: string
	storeSlug: string
	hostname: string
	publicationStatus: "DRAFT" | "PUBLISHED" | "SUSPENDED"
	ownerType: "MERCHANT" | "PLATFORM"
	commerceSettings?: Prisma.JsonValue | null
}

export function isPublicTenantStatus(status: string) {
	return ["ACTIVE", "TRIALING", "GRACE_PERIOD"].includes(status)
}

export class TenantResolutionError extends Error {
	readonly status: number
	readonly reason: "UNKNOWN_HOST" | "UNVERIFIED_DOMAIN" | "UNAVAILABLE_STORE"

	constructor(reason: TenantResolutionError["reason"], message: string, status = 404) {
		super(message)
		this.name = "TenantResolutionError"
		this.reason = reason
		this.status = status
	}
}

export function normalizeHostname(value: string | null | undefined): string {
	if (!value) return ""
	const withoutWhitespace = value.trim().toLowerCase()
	if (withoutWhitespace.startsWith("[")) {
		const closingBracket = withoutWhitespace.indexOf("]")
		return closingBracket >= 0 ? withoutWhitespace.slice(1, closingBracket) : withoutWhitespace
	}
	return withoutWhitespace.split(":")[0]
}

export function getRequestedStoreSlug(requestHeaders: Headers): string {
	const headerSlug = requestHeaders.get("x-nurava-store-slug")?.trim().toLowerCase() || ""
	if (headerSlug) return headerSlug

	const requestPath = requestHeaders.get("x-nurava-request-path")?.trim() || ""
	if (!requestPath) return ""
	try {
		const pathname = new URL(requestPath, "http://nurava.internal").pathname
		const [, prefix, rawSlug] = pathname.split("/")
		if (prefix !== "store" || !rawSlug) return ""
		const slug = decodeURIComponent(rawSlug).trim().toLowerCase()
		return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) && slug.length <= 63 ? slug : ""
	} catch {
		return ""
	}
}

function unavailableStore(context: { status: string; publicationStatus?: string }) {
	if (context.status === "SUSPENDED" || context.status === "DELETED" || context.publicationStatus === "SUSPENDED") {
		return new TenantResolutionError("UNAVAILABLE_STORE", "This store is currently unavailable.", 503)
	}
	return new TenantResolutionError("UNAVAILABLE_STORE", "This store has not been published.", 404)
}

function assertStoreRequestAccess(store: { ownerType: string; platformOwnerKey: string | null; tenant: { kind: string; status: string; verificationStatus: MerchantVerificationStatus }; publicationStatus: string }, options: { allowUnpublished: boolean; allowSuspended: boolean }) {
	const platformOwned = isPlatformOwnedStore(store)
	if (platformOwned) {
		if (store.tenant.kind !== "PLATFORM" || store.tenant.status !== "ACTIVE") throw unavailableStore({ status: store.tenant.status, publicationStatus: store.publicationStatus })
	} else {
		if (store.tenant.kind !== "MERCHANT") throw unavailableStore({ status: store.tenant.status, publicationStatus: store.publicationStatus })
		if (!options.allowUnpublished && !(options.allowSuspended && store.tenant.status === "SUSPENDED") && !isPublicTenantStatus(store.tenant.status)) throw unavailableStore({ status: store.tenant.status, publicationStatus: store.publicationStatus })
		if (!options.allowUnpublished && !canMerchantSell(store.tenant.verificationStatus)) throw new TenantResolutionError("UNAVAILABLE_STORE", "This merchant store is awaiting verification.", 404)
	}
	if (!options.allowUnpublished && !(options.allowSuspended && store.publicationStatus === "SUSPENDED") && store.publicationStatus !== "PUBLISHED") throw unavailableStore({ status: store.tenant.status, publicationStatus: store.publicationStatus })
}

/**
 * Resolve the store from the request host. Callers must use the returned IDs
 * for every tenant-owned query; request bodies and query strings are not used.
 */
export async function resolveTenantFromRequest(request: { headers: Headers }, options: { allowUnpublished?: boolean; allowSuspended?: boolean; includeCommerceSettings?: boolean } = {}): Promise<TenantContext> {
	const allowUnpublished = options.allowUnpublished === true
	const allowSuspended = options.allowSuspended === true
	const includeCommerceSettings = options.includeCommerceSettings === true
	const hostname = normalizeHostname(request.headers.get("host"))
	if (!hostname) throw new TenantResolutionError("UNKNOWN_HOST", "A valid request host is required.")

	const platformDomain = getPlatformDomain()
	const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1"
	const isLocalSubdomain = hostname.endsWith(".localhost")
	const isVercelProjectHost = hostname === "vercel.app" || hostname.endsWith(".vercel.app")
	const isCanonicalPlatformHost = hostname === platformDomain || hostname === `www.${platformDomain}` || isVercelProjectHost
	const requestedStoreSlug = getRequestedStoreSlug(request.headers)
	if (requestedStoreSlug && isCanonicalPlatformHost) {
		if (isHiddenStagingDemoStore(requestedStoreSlug)) throw new TenantResolutionError("UNKNOWN_HOST", "No store is configured for this host.")
		const store = await prisma.store.findUnique({
			where: { slug: requestedStoreSlug },
			select: { id: true, tenantId: true, slug: true, ownerType: true, platformOwnerKey: true, publicationStatus: true, commerceSettings: includeCommerceSettings, tenant: { select: { kind: true, status: true, verificationStatus: true } } },
		})
		if (!store) throw new TenantResolutionError("UNKNOWN_HOST", "No store is configured for this host.")
		assertStoreRequestAccess(store, { allowUnpublished, allowSuspended })
		return { tenantId: store.tenantId, storeId: store.id, storeSlug: store.slug, hostname, ownerType: store.ownerType as TenantContext["ownerType"], publicationStatus: store.publicationStatus as TenantContext["publicationStatus"], ...(includeCommerceSettings ? { commerceSettings: store.commerceSettings } : {}) }
	}

	// The canonical platform hosts must win over any stale or misconfigured
	// Domain row. Otherwise the platform homepage can resolve as a merchant
	// store after a full navigation from a storefront footer.
	const domain = isCanonicalPlatformHost
		? null
		: await prisma.domain.findUnique({
				where: { hostname },
				select: {
					hostname: true,
					verificationStatus: true,
					tenantId: true,
					storeId: true,
					store: { select: { slug: true, ownerType: true, platformOwnerKey: true, publicationStatus: true, commerceSettings: includeCommerceSettings, tenant: { select: { kind: true, status: true, verificationStatus: true } } } },
				},
			})

	if (domain) {
		if (isHiddenStagingDemoStore(domain.store.slug)) throw new TenantResolutionError("UNKNOWN_HOST", "No store is configured for this host.")
		if (domain.verificationStatus !== "VERIFIED") {
			throw new TenantResolutionError("UNVERIFIED_DOMAIN", "This domain is awaiting verification.", 409)
		}
		assertStoreRequestAccess(domain.store, { allowUnpublished, allowSuspended })
		return {
			tenantId: domain.tenantId,
			storeId: domain.storeId,
			storeSlug: domain.store.slug,
			hostname,
			publicationStatus: domain.store.publicationStatus,
			ownerType: domain.store.ownerType as TenantContext["ownerType"],
			...(includeCommerceSettings ? { commerceSettings: domain.store.commerceSettings } : {}),
		}
	}

	const isPlatformHost = hostname === platformDomain || hostname.endsWith(`.${platformDomain}`) || isVercelProjectHost
	const slug = isLocalHost || isCanonicalPlatformHost
		? "nuravatech"
		: isLocalSubdomain
			? hostname.slice(0, -".localhost".length)
			: isPlatformHost
				? hostname.slice(0, -(`.${platformDomain}`).length)
				: ""
	if (!slug) throw new TenantResolutionError("UNKNOWN_HOST", "No store is configured for this host.")
	if (isHiddenStagingDemoStore(slug)) throw new TenantResolutionError("UNKNOWN_HOST", "No store is configured for this host.")

	const store = await prisma.store.findUnique({
		where: { slug },
		select: { id: true, tenantId: true, slug: true, ownerType: true, platformOwnerKey: true, publicationStatus: true, commerceSettings: includeCommerceSettings, tenant: { select: { kind: true, status: true, verificationStatus: true } } },
	})
	if (!store) throw new TenantResolutionError("UNKNOWN_HOST", "No store is configured for this host.")
	assertStoreRequestAccess(store, { allowUnpublished, allowSuspended })

	return {
		tenantId: store.tenantId,
		storeId: store.id,
		storeSlug: store.slug,
		hostname,
		publicationStatus: store.publicationStatus,
		ownerType: store.ownerType as TenantContext["ownerType"],
		...(includeCommerceSettings ? { commerceSettings: store.commerceSettings } : {}),
	}
}

export function tenantScope(tenantId: string) {
	if (!tenantId.trim()) throw new Error("tenantId is required for a tenant-scoped query")
	return { tenantId }
}
