import { describe, test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { HIDDEN_STAGING_DEMO_STORE_SLUGS } from "../../backend/lib/store-visibility"
import { mockPrismaMethod } from "../tenant/mock-prisma-method"
import { getPublicCategoryUrls, getSitemapIndexXml, getSitemapRanges, getSitemapXml, sitemapCacheHeaders } from "../../frontend/src/lib/sitemap"

describe("sitemap generation", { concurrency: false }, () => {

test("sitemap index lists bounded child files on the configured production domain", () => {
	const previous = process.env.PLATFORM_DOMAIN
	process.env.PLATFORM_DOMAIN = "nuravahubstores.com"
	try {
		const xml = getSitemapIndexXml(2)
		assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?><sitemapindex/)
		assert.equal((xml.match(/<sitemap>/g) || []).length, 3)
		assert.match(xml, /https:\/\/nuravahubstores\.com\/sitemap\/0\.xml/)
		assert.match(xml, /https:\/\/nuravahubstores\.com\/sitemap\/2\.xml/)
	} finally {
		if (previous === undefined) delete process.env.PLATFORM_DOMAIN
		else process.env.PLATFORM_DOMAIN = previous
	}
})

test("fixed sitemap page remains valid and database independent", async () => {
	const xml = await getSitemapXml(0)
	assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?><urlset/)
	assert.match(xml, /https:\/\/nuravahubstores\.com\//)
	assert.match(xml, /https:\/\/nuravahubstores\.com\/privacy-policy/)
	assert.doesNotMatch(xml, /\/admin|\/manage|\/platform|\/api|\.vercel\.app/)
})

test("empty public data produces no dynamic sitemap pages", async () => {
	const restorers = [
		mockPrismaMethod(prisma.store, "count", async () => 0),
		mockPrismaMethod(prisma.product, "count", async () => 0),
		mockPrismaMethod(prisma.store, "findMany", async () => []),
		mockPrismaMethod(prisma.blogPost, "count", async () => 0),
	]
	try {
		assert.deepEqual(await getSitemapRanges(), [])
		const xml = getSitemapIndexXml(0)
		assert.equal((xml.match(/<sitemap>/g) || []).length, 1)
	} finally {
		for (const restore of restorers.reverse()) restore()
	}
})

test("published platform store, product, category, and article entries use canonical URLs", async () => {
	const updatedAt = new Date("2026-10-01T12:30:00.000Z")
	const store = {
		slug: "nurava-marketplace",
		ownerType: "PLATFORM",
		commerceSettings: null,
		categories: [{ slug: "phones" }],
		industry: null,
	}
	const storeQueryWhere: Array<Record<string, unknown>> = []
	const restorers = [
		mockPrismaMethod(prisma.store, "count", async ({ where }: { where: Record<string, unknown> }) => { storeQueryWhere.push(where); return 1 }),
		mockPrismaMethod(prisma.product, "count", async ({ where }: { where: Record<string, unknown> }) => { assert.equal(where.isPublished, true); return 2 }),
		mockPrismaMethod(prisma.blogPost, "count", async () => 1),
		mockPrismaMethod(prisma.store, "findMany", async (args: { select: Record<string, unknown>; where: Record<string, unknown> }) => {
		if (args.select.ownerType) return [store]
			storeQueryWhere.push(args.where)
			return [{ slug: "nurava-marketplace", updatedAt }]
		}),
		mockPrismaMethod(prisma.product, "findMany", async () => [
			{ slug: "pixel-phone", updatedAt, category: { slug: "phones" }, store: { slug: "nurava-marketplace", commerceSettings: null } },
			{ slug: "hidden-product", updatedAt, category: { slug: "hidden-category" }, store: { slug: "nurava-marketplace", commerceSettings: { categoryAvailability: { "hidden-category": false } } } },
		]),
		mockPrismaMethod(prisma.blogPost, "findMany", async () => [{ slug: "launch-guide", scopeKey: "platform", tenantId: null, updatedAt, tenant: null }]),
	]
	try {
		assert.deepEqual(await getPublicCategoryUrls(), ["https://nurava-marketplace.nuravahubstores.com/category/phones"])
		const storeXml = await getSitemapXml(1)
		const productXml = await getSitemapXml(2)
		const categoryXml = await getSitemapXml(3)
		const articleXml = await getSitemapXml(4)
		assert.match(storeXml, /https:\/\/nurava-marketplace\.nuravahubstores\.com\//)
		assert.match(storeXml, /https:\/\/nurava-marketplace\.nuravahubstores\.com\/products/)
		assert.match(productXml, /https:\/\/nurava-marketplace\.nuravahubstores\.com\/products\/pixel-phone/)
		assert.doesNotMatch(productXml, /hidden-product/)
		assert.match(categoryXml, /https:\/\/nurava-marketplace\.nuravahubstores\.com\/category\/phones/)
		assert.match(articleXml, /https:\/\/nuravahubstores\.com\/blog\/launch-guide/)
		assert.match(productXml, /<lastmod>2026-10-01T12:30:00\.000Z<\/lastmod>/)
		assert.deepEqual(storeQueryWhere[0].slug, { notIn: [...HIDDEN_STAGING_DEMO_STORE_SLUGS] })
		assert.equal(storeQueryWhere[0].publicationStatus, "PUBLISHED")
		assert.equal((storeQueryWhere[0].tenant as { is: { deletedAt: null; dataDeletedAt: null } }).is.deletedAt, null)
	} finally {
		for (const restore of restorers.reverse()) restore()
	}
})

test("dynamic sitemap database errors degrade to a valid empty XML page", async () => {
	const restorers = [
		mockPrismaMethod(prisma.store, "count", async () => { throw new Error("database unavailable") }),
		mockPrismaMethod(prisma.product, "count", async () => 0),
		mockPrismaMethod(prisma.store, "findMany", async () => []),
		mockPrismaMethod(prisma.blogPost, "count", async () => 0),
	]
	try {
		const xml = await getSitemapXml(1)
		assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?><urlset/)
		assert.match(xml, /<urlset[^>]*><\/urlset>$/)
	} finally {
		for (const restore of restorers.reverse()) restore()
	}
})

test("demo exclusions do not include the platform-owned store and cache is hourly", () => {
	assert.deepEqual(HIDDEN_STAGING_DEMO_STORE_SLUGS, ["nuravatech", "nurava-furnitures", "nurava-cakes", "nurava-boutiques"])
	assert.equal(HIDDEN_STAGING_DEMO_STORE_SLUGS.includes("nurava-marketplace" as never), false)
	assert.equal(sitemapCacheHeaders()["Cache-Control"], "public, s-maxage=3600, stale-while-revalidate=86400")
})

})
