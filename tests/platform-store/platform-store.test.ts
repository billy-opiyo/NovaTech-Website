import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { assertTenantProductLimit } from "../../backend/billing/subscription"
import { isApprovedMerchantIndustry } from "../../backend/lib/merchant-industry-policy"
import { isPlatformOwnedStore } from "../../backend/lib/platform-store"
import { summarizePlatformStoreFinancials } from "../../backend/lib/platform-store-report"
import { resolveStoreTheme } from "../../frontend/src/lib/store-theme"
import { getFilteredProducts } from "../../backend/services/productService"
import { getPlatformStoreHomepageProducts } from "../../backend/services/recommendation.service"
import { mockPrismaMethod } from "../tenant/mock-prisma-method"

test("platform store ownership requires the canonical owner type and key", () => {
	assert.equal(isPlatformOwnedStore({ ownerType: "PLATFORM", platformOwnerKey: "nurava-hubstores" }), true)
	assert.equal(isPlatformOwnedStore({ ownerType: "MERCHANT", platformOwnerKey: "nurava-hubstores" }), false)
	assert.equal(isPlatformOwnedStore({ ownerType: "PLATFORM", platformOwnerKey: "other" }), false)
	assert.equal(isPlatformOwnedStore(null), false)
})

test("platform-owned storefronts inherit the published platform theme while merchants retain their store theme", () => {
	const platformDesign = { themePreset: "royal-purple", colors: { primary: "#7c3aed" } }
	const platformTheme = resolveStoreTheme({ ownerType: "PLATFORM", themePreset: "royal-purple", platformTheme: platformDesign, themeOverrides: { colors: { primary: "#ff0000" } } })
	assert.equal(platformTheme.preset.id, "royal-purple")
	assert.equal(platformTheme.overrides, platformDesign)

	const merchantOverrides = { colors: { primary: "#008000" } }
	const merchantTheme = resolveStoreTheme({ ownerType: "MERCHANT", themePreset: "arctic-cobalt", platformTheme: platformDesign, themeOverrides: merchantOverrides })
	assert.equal(merchantTheme.preset.id, "arctic-cobalt")
	assert.equal(merchantTheme.overrides, merchantOverrides)
})

test("platform stores bypass merchant product entitlements while merchants still use them", async () => {
	let entitlementReads = 0
	const restoreStore = mockPrismaMethod(prisma.store, "findUnique", async ({ where }: { where: { tenantId: string } }) => where.tenantId === "platform-tenant"
		? { ownerType: "PLATFORM", platformOwnerKey: "nurava-hubstores" }
		: { ownerType: "MERCHANT", platformOwnerKey: null })
	const restoreEntitlement = mockPrismaMethod(prisma.featureEntitlement, "findFirst", async () => { entitlementReads += 1; return null })
	const restoreSubscription = mockPrismaMethod(prisma.subscription, "findFirst", async () => { entitlementReads += 1; return null })
	const restoreCount = mockPrismaMethod(prisma.product, "count", async () => 1)
	try {
		await assertTenantProductLimit("platform-tenant")
		assert.equal(entitlementReads, 0)
		await assert.rejects(() => assertTenantProductLimit("merchant-tenant", 50), /allows 50 active products/)
		assert.equal(entitlementReads, 2)
	} finally { restoreStore(); restoreEntitlement(); restoreSubscription(); restoreCount() }
})

test("merchant onboarding remains limited to the four approved industries", () => {
	assert.equal(isApprovedMerchantIndustry("electronics"), true)
	assert.equal(isApprovedMerchantIndustry("cakes"), true)
	assert.equal(isApprovedMerchantIndustry("furniture"), true)
	assert.equal(isApprovedMerchantIndustry("boutiques"), true)
	assert.equal(isApprovedMerchantIndustry("home-goods"), false)
})

test("platform store reporting sums completed sales and refunds across all records and recorded fulfillment costs", () => {
	assert.deepEqual(summarizePlatformStoreFinancials({
		completedPaymentAmounts: [1250, 250],
		completedRefundAmounts: [100],
		fulfilledItems: [{ quantity: 2, supplierCost: 300, deliveryCost: 80 }, { quantity: 1, supplierCost: 250, deliveryCost: 40 }],
	}), {
		paidRevenue: 1500,
		refundedAmount: 100,
		netRevenueAfterRefunds: 1400,
		supplierCost: 850,
		supplierDeliveryCost: 120,
		grossMarginAfterRecordedSupplierCosts: 430,
	})
})

test("unpublished platform catalog products stay out of public product queries", async () => {
	const queries: Record<string, unknown>[] = []
	const restoreCategories = mockPrismaMethod(prisma.category, "findMany", async () => [])
	const restoreProducts = mockPrismaMethod(prisma.product, "findMany", async ({ where }: { where: Record<string, unknown> }) => { queries.push(where); return [] })
	const restoreCount = mockPrismaMethod(prisma.product, "count", async ({ where }: { where: Record<string, unknown> }) => { queries.push(where); return 0 })
	try {
		await getFilteredProducts(new URLSearchParams(), "platform-tenant", { storeId: "platform-store", ownerType: "PLATFORM", commerceSettings: null })
		assert.ok(queries.length >= 2)
		assert.equal(queries.every((where) => where.isPublished === true), true)
		queries.length = 0
		await getFilteredProducts(new URLSearchParams("industry=electronics&category=phones"), "platform-tenant", { storeId: "platform-store", ownerType: "PLATFORM", commerceSettings: null })
		assert.ok(JSON.stringify(queries[0]).includes('"slug":"phones"'))
		assert.ok(JSON.stringify(queries[0]).includes('"slug":"electronics"'))
		queries.length = 0
		await getFilteredProducts(new URLSearchParams(), "merchant-tenant", { storeId: "merchant-store", ownerType: "MERCHANT", commerceSettings: null })
		assert.ok(queries.length >= 2)
		assert.equal(queries.every((where) => !("isPublished" in where)), true)
	} finally { restoreCategories(); restoreProducts(); restoreCount() }
})

test("platform homepage product query includes the full published catalog and stays store scoped", async () => {
	let productQuery: { where: Record<string, unknown>; take?: number } | undefined
	const restoreStore = mockPrismaMethod(prisma.store, "findUnique", async () => ({ id: "platform-store", tenantId: "platform-tenant", ownerType: "PLATFORM", platformOwnerKey: "nurava-hubstores" }))
	const restoreProducts = mockPrismaMethod(prisma.product, "findMany", async (query: { where: Record<string, unknown>; take?: number }) => { productQuery = query; return [] })
	try {
		assert.deepEqual(await getPlatformStoreHomepageProducts(), [])
		assert.equal(productQuery?.where.tenantId, "platform-tenant")
		assert.equal(productQuery?.where.storeId, "platform-store")
		assert.equal(productQuery?.where.isPublished, true)
		assert.equal(productQuery?.take, undefined)
		assert.ok(productQuery?.where.category)
	} finally { restoreStore(); restoreProducts() }
})
