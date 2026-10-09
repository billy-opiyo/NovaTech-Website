import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { getFeaturedProducts, getSimilarProducts } from "../../backend/services/recommendation.service"
import { mockPrismaMethod } from "./mock-prisma-method"

test("recommendation reads stay inside the resolved tenant", async () => {
	const calls: Array<{ method: string; where: unknown }> = []
	const restoreProductFindMany = mockPrismaMethod(prisma.product, "findMany", async ({ where }: { where: unknown }) => { calls.push({ method: "findMany", where }); return [] })
	const restoreProductFindFirst = mockPrismaMethod(prisma.product, "findFirst", async ({ where }: { where: unknown }) => { calls.push({ method: "findFirst", where }); return null })
	const restoreStoreFindFirst = mockPrismaMethod(prisma.store, "findFirst", async ({ where }: { where: unknown }) => { calls.push({ method: "store.findFirst", where }); return { commerceSettings: {} } })
	const restoreStoreFindUnique = mockPrismaMethod(prisma.store, "findUnique", async ({ where }: { where: unknown }) => { calls.push({ method: "store.findUnique", where }); return { id: "store-a", commerceSettings: {} } })
	const restoreCategoryFindMany = mockPrismaMethod(prisma.category, "findMany", async ({ where }: { where: unknown }) => { calls.push({ method: "category.findMany", where }); return [] })
	try {
		assert.deepEqual(await getFeaturedProducts("tenant-a", 4), [])
		assert.deepEqual(await getSimilarProducts("product-b", "tenant-a", 4), [])
		assert.deepEqual(calls, [
			{ method: "store.findUnique", where: { tenantId: "tenant-a" } },
			{ method: "category.findMany", where: { tenantId: "tenant-a", storeId: "store-a" } },
			{ method: "findMany", where: { tenantId: "tenant-a", isFeatured: true, OR: [
				{ variants: { none: { tenantId: "tenant-a" } }, stock: { gt: 0 } },
				{ variants: { some: { tenantId: "tenant-a", stock: { gt: 0 } } } },
			] } },
			{ method: "findFirst", where: { id: "product-b", tenantId: "tenant-a" } },
		])
	} finally {
		restoreProductFindMany()
		restoreProductFindFirst()
		restoreStoreFindFirst()
		restoreStoreFindUnique()
		restoreCategoryFindMany()
	}
})
