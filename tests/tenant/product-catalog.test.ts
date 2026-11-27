import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { getFilteredProducts } from "../../backend/services/productService"
import { mockPrismaMethod } from "./mock-prisma-method"

const storeContext = { storeId: "store-a", ownerType: "MERCHANT", commerceSettings: {} } as const

test("lightweight public catalog aggregates approved ratings without loading review rows", async () => {
	let productQuery: Record<string, unknown> | undefined
	let ratingWhere: unknown
	const restoreProductFindMany = mockPrismaMethod(prisma.product, "findMany", async (query: Record<string, unknown>) => {
		productQuery = query
		return [{ id: "product-a", stock: 3, variants: [], _count: { reviews: 2 } }]
	})
	const restoreProductCount = mockPrismaMethod(prisma.product, "count", async () => 1)
	const restoreCategoryFindMany = mockPrismaMethod(prisma.category, "findMany", async () => [])
	const restoreReviewFindMany = mockPrismaMethod(prisma.review, "findMany", async () => { throw new Error("lightweight catalog must not load review rows") })
	const restoreReviewGroupBy = mockPrismaMethod(prisma.review, "groupBy", async (query: { where: unknown }) => {
		ratingWhere = query.where
		return [{ productId: "product-a", _avg: { rating: 4.5 } }]
	})
	try {
		const result = await getFilteredProducts(new URLSearchParams({ limit: "12" }), "tenant-a", storeContext, { includeReviewDetails: false })
		assert.equal((productQuery?.where as { tenantId?: string; storeId?: string }).tenantId, "tenant-a")
		assert.equal((productQuery?.where as { tenantId?: string; storeId?: string }).storeId, "store-a")
		assert.equal((productQuery?.include as Record<string, unknown>).reviews, undefined)
		assert.deepEqual(ratingWhere, { tenantId: "tenant-a", productId: { in: ["product-a"] }, moderationStatus: "APPROVED" })
		assert.equal(result.products[0].averageRating, 4.5)
		assert.equal(result.products[0].reviewCount, 2)
		assert.equal("reviews" in result.products[0], false)
	} finally {
		restoreProductFindMany()
		restoreProductCount()
		restoreCategoryFindMany()
		restoreReviewFindMany()
		restoreReviewGroupBy()
	}
})

test("public catalog API keeps review rows available by default and tenant-scoped", async () => {
	const restoreProductFindMany = mockPrismaMethod(prisma.product, "findMany", async (query: Record<string, unknown>) => {
		const include = query.include as Record<string, unknown>
		assert.deepEqual(include.reviews, { where: { moderationStatus: "APPROVED" }, select: { rating: true } })
		return [{ id: "product-a", stock: 3, variants: [], reviews: [{ rating: 4 }, { rating: 5 }], _count: { reviews: 2 } }]
	})
	const restoreProductCount = mockPrismaMethod(prisma.product, "count", async () => 1)
	const restoreCategoryFindMany = mockPrismaMethod(prisma.category, "findMany", async () => [])
	const restoreReviewFindMany = mockPrismaMethod(prisma.review, "findMany", async () => { throw new Error("review rows must come from the product query") })
	const restoreReviewGroupBy = mockPrismaMethod(prisma.review, "groupBy", async () => { throw new Error("default API response should preserve review rows") })
	try {
		const result = await getFilteredProducts(new URLSearchParams({ limit: "12" }), "tenant-a", storeContext)
		assert.deepEqual(result.products[0].reviews, [{ rating: 4 }, { rating: 5 }])
		assert.equal(result.products[0].averageRating, 4.5)
		assert.equal(result.products[0].reviewCount, 2)
	} finally {
		restoreProductFindMany()
		restoreProductCount()
		restoreCategoryFindMany()
		restoreReviewFindMany()
		restoreReviewGroupBy()
	}
})
