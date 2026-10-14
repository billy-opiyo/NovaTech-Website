import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { getFeaturedProducts, getSimilarProducts } from "../../backend/services/recommendation.service"

test("recommendation reads stay inside the resolved tenant", async () => {
	const productFindMany = prisma.product.findMany
	const productFindFirst = prisma.product.findFirst
	const storeFindFirst = prisma.store.findFirst
	const storeFindUnique = prisma.store.findUnique
	const categoryFindMany = prisma.category.findMany
	const calls: Array<{ method: string; where: unknown }> = []
	;(prisma.product.findMany as any) = async ({ where }: any) => { calls.push({ method: "findMany", where }); return [] }
	;(prisma.product.findFirst as any) = async ({ where }: any) => { calls.push({ method: "findFirst", where }); return null }
	;(prisma.store.findFirst as any) = async ({ where }: any) => { calls.push({ method: "store.findFirst", where }); return { commerceSettings: {} } }
	;(prisma.store.findUnique as any) = async ({ where }: any) => { calls.push({ method: "store.findUnique", where }); return { id: "store-a", commerceSettings: {} } }
	;(prisma.category.findMany as any) = async ({ where }: any) => { calls.push({ method: "category.findMany", where }); return [] }
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
		;(prisma.product.findMany as any) = productFindMany
		;(prisma.product.findFirst as any) = productFindFirst
		;(prisma.store.findFirst as any) = storeFindFirst
		;(prisma.store.findUnique as any) = storeFindUnique
		;(prisma.category.findMany as any) = categoryFindMany
	}
})
