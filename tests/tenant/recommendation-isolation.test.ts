import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { getFeaturedProducts, getSimilarProducts } from "../../backend/services/recommendation.service"
import { getHiddenStoreCategorySlugs } from "../../backend/services/productService"
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
			{ method: "category.findMany", where: { tenantId: "tenant-a", store: { is: { tenantId: "tenant-a" } } } },
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

test("hidden category and store settings reads run concurrently and stay tenant-scoped", async () => {
	const calls: string[] = []
	const categoryWheres: unknown[] = []
	let releaseStore!: () => void
	const storeRead = new Promise((resolve) => {
		releaseStore = () => resolve({ id: "store-a", commerceSettings: { categoryAvailability: { phones: false } } })
	})
	const restoreStoreFindUnique = mockPrismaMethod(prisma.store, "findUnique", async ({ where }: { where: unknown }) => {
		calls.push("store")
		assert.deepEqual(where, { tenantId: "tenant-a" })
		return storeRead
	})
	const restoreCategoryFindMany = mockPrismaMethod(prisma.category, "findMany", async ({ where }: { where: unknown }) => {
		calls.push("categories")
		categoryWheres.push(where)
		return [{ slug: "phones", storeId: "store-a" }]
	})
	try {
		const pending = getHiddenStoreCategorySlugs("tenant-a")
		assert.deepEqual(calls, ["store", "categories"])
		releaseStore()
		assert.deepEqual(await pending, ["phones"])
		assert.deepEqual(categoryWheres, [{ tenantId: "tenant-a", store: { is: { tenantId: "tenant-a" } } }])
	} finally {
		restoreStoreFindUnique()
		restoreCategoryFindMany()
	}
})

test("product category visibility reuses resolved store settings and scopes categories to that store", async () => {
	let storeLookups = 0
	let categoryWhere: unknown
	const restoreStoreFindUnique = mockPrismaMethod(prisma.store, "findUnique", async () => {
		storeLookups += 1
		throw new Error("resolved store context should avoid a second store lookup")
	})
	const restoreCategoryFindMany = mockPrismaMethod(prisma.category, "findMany", async ({ where }: { where: unknown }) => {
		categoryWhere = where
		return [{ slug: "phones", storeId: "store-a" }]
	})
	try {
		const hidden = await getHiddenStoreCategorySlugs("tenant-a", {
			storeId: "store-a",
			commerceSettings: { categoryAvailability: { phones: false } },
		})
		assert.deepEqual(hidden, ["phones"])
		assert.equal(storeLookups, 0)
		assert.deepEqual(categoryWhere, { tenantId: "tenant-a", storeId: "store-a" })
	} finally {
		restoreStoreFindUnique()
		restoreCategoryFindMany()
	}
})
