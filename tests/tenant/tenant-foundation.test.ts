import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { normalizeHostname, resolveTenantFromRequest, tenantScope, TenantResolutionError } from "../../backend/lib/tenant"
import { getActiveMembership, requireMembership } from "../../backend/lib/tenant-access"
import { mockPrismaMethod } from "./mock-prisma-method"

test("tenant host normalization removes development ports", () => {
	assert.equal(normalizeHostname(" NOVATECH.NOVATECHSTORE.CO.KE:3000 "), "novatech.novatechstore.co.ke")
	assert.equal(normalizeHostname("[::1]:3000"), "::1")
})

test("tenantScope rejects an empty tenant boundary", () => {
	assert.deepEqual(tenantScope("tenant-a"), { tenantId: "tenant-a" })
	assert.throws(() => tenantScope("  "), /tenantId is required/)
})

test("request tenant resolution refuses unknown hosts", async () => {
	const restoreDomain = mockPrismaMethod(prisma.domain, "findUnique", async () => null)
	const restoreStore = mockPrismaMethod(prisma.store, "findUnique", async () => null)
	try {
		await assert.rejects(
			() => resolveTenantFromRequest({ headers: new Headers({ host: "other.example" }) }),
			(error: unknown) => error instanceof Error && error.name === TenantResolutionError.name && "reason" in error && error.reason === "UNKNOWN_HOST",
		)
	} finally {
		restoreDomain()
		restoreStore()
	}
})

test("canonical platform hosts bypass merchant domain mappings", async () => {
	let domainLookups = 0
	const restoreDomain = mockPrismaMethod(prisma.domain, "findUnique", async () => {
		domainLookups += 1
		return {
			hostname: "nuravatech.com",
			verificationStatus: "VERIFIED",
			tenantId: "merchant-tenant",
			storeId: "merchant-store",
			store: { slug: "merchant", publicationStatus: "PUBLISHED", tenant: { status: "ACTIVE", verificationStatus: "APPROVED" } },
		}
	})
	const restoreStore = mockPrismaMethod(prisma.store, "findUnique", async ({ where }: { where: { slug?: string } }) => where.slug === "nuravatech" ? {
		id: "platform-store",
		tenantId: "platform-tenant",
		slug: "nuravatech",
		publicationStatus: "PUBLISHED",
			tenant: { status: "ACTIVE", verificationStatus: "APPROVED" },
	} : null)
	try {
		for (const hostname of ["nuravatech.com:3000", "www.nuravatech.com:3000"]) {
			const context = await resolveTenantFromRequest({ headers: new Headers({ host: hostname }) })
			assert.equal(context.storeSlug, "nuravatech")
			assert.equal(context.tenantId, "platform-tenant")
		}
		assert.equal(domainLookups, 0)
	} finally {
		restoreDomain()
		restoreStore()
	}
})

test("Vercel platform hosts resolve an explicitly scoped store slug", async () => {
	let domainLookups = 0
	const restoreDomain = mockPrismaMethod(prisma.domain, "findUnique", async () => {
		domainLookups += 1
		return null
	})
	const restoreStore = mockPrismaMethod(prisma.store, "findUnique", async ({ where }: { where: { slug?: string } }) => where.slug === "demo" ? {
		id: "store-demo",
		tenantId: "tenant-demo",
		slug: "demo",
		publicationStatus: "PUBLISHED",
		tenant: { status: "ACTIVE", verificationStatus: "APPROVED" },
	} : null)
	try {
		const context = await resolveTenantFromRequest({ headers: new Headers({ host: "nuravatech-saas-staging.vercel.app", "x-nurava-store-slug": "demo" }) })
		assert.equal(context.storeSlug, "demo")
		assert.equal(context.tenantId, "tenant-demo")
		assert.equal(domainLookups, 0)
	} finally {
		restoreDomain()
		restoreStore()
	}
})

test("Vercel platform store paths remain scoped when the middleware slug header is missing", async () => {
	const restoreDomain = mockPrismaMethod(prisma.domain, "findUnique", async () => null)
	const restoreStore = mockPrismaMethod(prisma.store, "findUnique", async ({ where }: { where: { slug?: string } }) => where.slug === "demo" ? {
		id: "store-demo",
		tenantId: "tenant-demo",
		slug: "demo",
		publicationStatus: "PUBLISHED",
		tenant: { status: "ACTIVE", verificationStatus: "APPROVED" },
	} : null)
	try {
		const context = await resolveTenantFromRequest({ headers: new Headers({ host: "nuravatech-saas-staging.vercel.app", "x-nurava-request-path": "/store/demo" }) })
		assert.equal(context.storeSlug, "demo")
		assert.equal(context.tenantId, "tenant-demo")
	} finally {
		restoreDomain()
		restoreStore()
	}
})

test("local store subdomains resolve by store slug", async () => {
	const restoreDomain = mockPrismaMethod(prisma.domain, "findUnique", async () => null)
	const restoreStore = mockPrismaMethod(prisma.store, "findUnique", async ({ where }: { where: { slug?: string } }) => where.slug === "demo" ? {
		id: "store-demo",
		tenantId: "tenant-demo",
		slug: "demo",
		publicationStatus: "PUBLISHED",
			tenant: { status: "TRIALING", verificationStatus: "APPROVED" },
	} : null)
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
		restoreDomain()
		restoreStore()
	}
})

test("membership authorization cannot be widened by another tenant id", async () => {
	const restoreMembership = mockPrismaMethod(prisma.membership, "findFirst", async ({ where }: { where: { tenantId?: string } }) =>
		where.tenantId === "tenant-a" ? { tenantId: "tenant-a", userId: "user-a", active: true, role: "STORE_EDITOR" } : null
	)
	try {
		assert.ok(await getActiveMembership("user-a", "tenant-a"))
		assert.equal(await getActiveMembership("user-a", "tenant-b"), null)
		await assert.rejects(() => requireMembership("user-a", "tenant-b"), /do not have access/)
	} finally {
		restoreMembership()
	}
})
