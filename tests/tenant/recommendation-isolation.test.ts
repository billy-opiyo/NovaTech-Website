import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { getFeaturedProducts, getSimilarProducts } from "../../backend/services/recommendation.service"

test("recommendation reads stay inside the resolved tenant", async () => {
	const productFindMany = prisma.product.findMany
	const productFindFirst = prisma.product.findFirst
	const calls: Array<{ method: string; where: unknown }> = []
	;(prisma.product.findMany as any) = async ({ where }: any) => { calls.push({ method: "findMany", where }); return [] }
	;(prisma.product.findFirst as any) = async ({ where }: any) => { calls.push({ method: "findFirst", where }); return null }
	try {
		assert.deepEqual(await getFeaturedProducts("tenant-a", 4), [])
		assert.deepEqual(await getSimilarProducts("product-b", "tenant-a", 4), [])
		assert.deepEqual(calls, [
			{ method: "findMany", where: { tenantId: "tenant-a", isFeatured: true, stock: { gt: 0 } } },
			{ method: "findFirst", where: { id: "product-b", tenantId: "tenant-a" } },
		])
	} finally {
		;(prisma.product.findMany as any) = productFindMany
		;(prisma.product.findFirst as any) = productFindFirst
	}
})
