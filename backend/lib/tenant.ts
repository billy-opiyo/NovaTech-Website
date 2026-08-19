import prisma from "./db"

export type TenantContext = {
	tenantId: string
	storeId: string
	storeSlug: string
	hostname: string
	publicationStatus: "DRAFT" | "PUBLISHED" | "SUSPENDED"
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

function unavailableStore(context: { status: string; publicationStatus?: string }) {
	if (context.status === "SUSPENDED" || context.status === "DELETED" || context.publicationStatus === "SUSPENDED") {
		return new TenantResolutionError("UNAVAILABLE_STORE", "This store is currently unavailable.", 503)
	}
	return new TenantResolutionError("UNAVAILABLE_STORE", "This store has not been published.", 404)
}

/**
 * Resolve the store from the request host. Callers must use the returned IDs
 * for every tenant-owned query; request bodies and query strings are not used.
 */
export async function resolveTenantFromRequest(request: { headers: Headers }): Promise<TenantContext> {
	const hostname = normalizeHostname(request.headers.get("host"))
	if (!hostname) throw new TenantResolutionError("UNKNOWN_HOST", "A valid request host is required.")

	const domain = await prisma.domain.findUnique({
		where: { hostname },
		select: {
			hostname: true,
			verificationStatus: true,
			tenantId: true,
			storeId: true,
			store: { select: { slug: true, publicationStatus: true, tenant: { select: { status: true } } } },
		},
	})

	if (domain) {
		if (domain.verificationStatus !== "VERIFIED") {
			throw new TenantResolutionError("UNVERIFIED_DOMAIN", "This domain is awaiting verification.", 409)
		}
		if (domain.store.tenant.status !== "ACTIVE" && domain.store.tenant.status !== "TRIALING") {
			throw unavailableStore({ status: domain.store.tenant.status, publicationStatus: domain.store.publicationStatus })
		}
		if (domain.store.publicationStatus !== "PUBLISHED") throw unavailableStore({ status: domain.store.tenant.status, publicationStatus: domain.store.publicationStatus })
		return {
			tenantId: domain.tenantId,
			storeId: domain.storeId,
			storeSlug: domain.store.slug,
			hostname,
			publicationStatus: domain.store.publicationStatus,
		}
	}

	const platformDomain = normalizeHostname(process.env.PLATFORM_DOMAIN || "novatechstore.co.ke")
	const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1"
	const isPlatformHost = hostname === platformDomain || hostname.endsWith(`.${platformDomain}`)
	const slug = isLocalHost || hostname === platformDomain ? "novatech" : isPlatformHost ? hostname.slice(0, -(`.${platformDomain}`).length) : ""
	if (!slug) throw new TenantResolutionError("UNKNOWN_HOST", "No store is configured for this host.")

	const store = await prisma.store.findUnique({
		where: { slug },
		select: { id: true, tenantId: true, slug: true, publicationStatus: true, tenant: { select: { status: true } } },
	})
	if (!store) throw new TenantResolutionError("UNKNOWN_HOST", "No store is configured for this host.")
	if (store.tenant.status !== "ACTIVE" && store.tenant.status !== "TRIALING") throw unavailableStore({ status: store.tenant.status, publicationStatus: store.publicationStatus })
	if (store.publicationStatus !== "PUBLISHED") throw unavailableStore({ status: store.tenant.status, publicationStatus: store.publicationStatus })

	return {
		tenantId: store.tenantId,
		storeId: store.id,
		storeSlug: store.slug,
		hostname,
		publicationStatus: store.publicationStatus,
	}
}

export function tenantScope(tenantId: string) {
	if (!tenantId.trim()) throw new Error("tenantId is required for a tenant-scoped query")
	return { tenantId }
}
