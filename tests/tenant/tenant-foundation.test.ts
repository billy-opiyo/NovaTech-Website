import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { normalizeHostname, resolveTenantFromRequest, tenantScope, TenantResolutionError } from "../../backend/lib/tenant"
import { getActiveMembership, requireMembership } from "../../backend/lib/tenant-access"

test("tenant host normalization removes development ports", () => {
	assert.equal(normalizeHostname(" NOVATECH.NOVATECHSTORE.CO.KE:3000 "), "novatech.novatechstore.co.ke")
	assert.equal(normalizeHostname("[::1]:3000"), "::1")
})

test("tenantScope rejects an empty tenant boundary", () => {
	assert.deepEqual(tenantScope("tenant-a"), { tenantId: "tenant-a" })
	assert.throws(() => tenantScope("  "), /tenantId is required/)
})

test("request tenant resolution refuses unknown hosts", async () => {
	const domainFindUnique = prisma.domain.findUnique
	const storeFindUnique = prisma.store.findUnique
	;(prisma.domain.findUnique as any) = async () => null
	;(prisma.store.findUnique as any) = async () => null
	try {
		await assert.rejects(
			() => resolveTenantFromRequest({ headers: new Headers({ host: "other.example" }) }),
			(error: any) => error?.name === "TenantResolutionError" && error.reason === "UNKNOWN_HOST",
		)
	} finally {
		;(prisma.domain.findUnique as any) = domainFindUnique
		;(prisma.store.findUnique as any) = storeFindUnique
	}
})

test("canonical platform hosts bypass merchant domain mappings", async () => {
	const domainFindUnique = prisma.domain.findUnique
	const storeFindUnique = prisma.store.findUnique
	let domainLookups = 0
	;(prisma.domain.findUnique as any) = async () => {
		domainLookups += 1
		return {
			hostname: "nuravatech.com",
			verificationStatus: "VERIFIED",
			tenantId: "merchant-tenant",
			storeId: "merchant-store",
			store: { slug: "merchant", publicationStatus: "PUBLISHED", tenant: { status: "ACTIVE" } },
		}
	}
	;(prisma.store.findUnique as any) = async ({ where }: any) => where.slug === "novatech" ? {
		id: "platform-store",
		tenantId: "platform-tenant",
		slug: "novatech",
		publicationStatus: "PUBLISHED",
		tenant: { status: "ACTIVE" },
	} : null
	try {
		for (const hostname of ["nuravatech.com:3000", "www.nuravatech.com:3000"]) {
			const context = await resolveTenantFromRequest({ headers: new Headers({ host: hostname }) })
			assert.equal(context.storeSlug, "novatech")
			assert.equal(context.tenantId, "platform-tenant")
		}
		assert.equal(domainLookups, 0)
	} finally {
		;(prisma.domain.findUnique as any) = domainFindUnique
		;(prisma.store.findUnique as any) = storeFindUnique
	}
})

test("local store subdomains resolve by store slug", async () => {
	const domainFindUnique = prisma.domain.findUnique
	const storeFindUnique = prisma.store.findUnique
	;(prisma.domain.findUnique as any) = async () => null
	;(prisma.store.findUnique as any) = async ({ where }: any) => where.slug === "demo" ? {
		id: "store-demo",
		tenantId: "tenant-demo",
		slug: "demo",
		publicationStatus: "PUBLISHED",
		tenant: { status: "TRIALING" },
	} : null
	try {
		const context = await resolveTenantFromRequest({ headers: new Headers({ host: "demo.localhost:3000" }) })
		assert.deepEqual(context, {
			tenantId: "tenant-demo",
			storeId: "store-demo",
			storeSlug: "demo",
			hostname: "demo.localhost",
			publicationStatus: "PUBLISHED",
		})
	} finally {
		;(prisma.domain.findUnique as any) = domainFindUnique
		;(prisma.store.findUnique as any) = storeFindUnique
	}
})

test("membership authorization cannot be widened by another tenant id", async () => {
	const findFirst = prisma.membership.findFirst
	;(prisma.membership.findFirst as any) = async ({ where }: any) =>
		where.tenantId === "tenant-a" ? { tenantId: "tenant-a", userId: "user-a", active: true, role: "STORE_EDITOR" } : null
	try {
		assert.ok(await getActiveMembership("user-a", "tenant-a"))
		assert.equal(await getActiveMembership("user-a", "tenant-b"), null)
		await assert.rejects(() => requireMembership("user-a", "tenant-b"), /do not have access/)
	} finally {
		;(prisma.membership.findFirst as any) = findFirst
	}
})
