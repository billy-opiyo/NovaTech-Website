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
