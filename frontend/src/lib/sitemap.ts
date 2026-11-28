import type { Prisma } from "@prisma/client"
import prisma from "backend/lib/db"
import { HIDDEN_STAGING_DEMO_STORE_SLUGS } from "backend/lib/store-visibility"
import { getPlatformDomain } from "backend/lib/platform-domain"
import { clientConfig } from "../config/client.config"

export const SITEMAP_REVALIDATE_SECONDS = 3600
const SITEMAP_PAGE_SIZE = 45_000
const STORE_PAGE_SIZE = Math.floor(SITEMAP_PAGE_SIZE / 3)
const PUBLIC_TENANT_STATUSES = ["ACTIVE", "TRIALING", "GRACE_PERIOD"] as const

const publicTenantWhere: Prisma.TenantWhereInput = {
	deletedAt: null,
	dataDeletedAt: null,
	status: { in: [...PUBLIC_TENANT_STATUSES] },
	OR: [{ kind: "PLATFORM" }, { kind: "MERCHANT", verificationStatus: "APPROVED" }],
}

const publicStoreWhere: Prisma.StoreWhereInput = {
	publicationStatus: "PUBLISHED",
	// The first-party `nurava-marketplace` slug is not in this demo exclusion list.
	slug: { notIn: [...HIDDEN_STAGING_DEMO_STORE_SLUGS] },
	tenant: { is: publicTenantWhere },
	OR: [
		{ ownerType: "PLATFORM" },
		{ ownerType: "MERCHANT", tenant: { is: { ...publicTenantWhere, kind: "MERCHANT", verificationStatus: "APPROVED" } } },
	],
}

const publicProductCategoryWhere: Prisma.CategoryWhereInput = {
	active: true,
	OR: [{ industryId: null }, { industry: { is: { active: true } } }],
}

const publicBlogTenantWhere: Prisma.TenantWhereInput = {
	...publicTenantWhere,
	store: { is: publicStoreWhere },
}

type SitemapGroup = "stores" | "products" | "categories" | "articles"
type SitemapRange = { group: SitemapGroup; firstId: number; pages: number }
type Counts = Record<SitemapGroup, number>
export type SitemapEntry = { url: string; lastModified?: Date }

function platformOrigin() {
	return `https://${getPlatformDomain()}`
}

function storeOrigin(slug: string) {
	if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) return null
	return `https://${slug}.${getPlatformDomain()}`
}

function rangesFromCounts(counts: Counts): SitemapRange[] {
	let nextId = 1 // ID 0 is reserved for the fixed platform URLs.
	return (Object.entries(counts) as Array<[SitemapGroup, number]>).flatMap(([group, count]) => {
		const pageSize = group === "stores" ? STORE_PAGE_SIZE : SITEMAP_PAGE_SIZE
		const pages = Math.ceil(count / pageSize)
		if (!pages) return []
		const range = { group, firstId: nextId, pages }
		nextId += pages
		return [range]
	})
}

export async function getPublicCategoryUrls(): Promise<string[]> {
	const stores = await prisma.store.findMany({
		where: publicStoreWhere,
		select: {
			slug: true,
			ownerType: true,
			commerceSettings: true,
			categories: { where: { active: true, OR: [{ industryId: null }, { industry: { is: { active: true } } }] }, select: { slug: true } },
			industry: { select: { slug: true, categoryTemplates: { where: { active: true }, select: { slug: true } } } },
		},
	})
	const urls = new Set<string>()
	for (const store of stores) {
		const origin = storeOrigin(store.slug)
		if (!origin) continue
		const availability = (store.commerceSettings as { categoryAvailability?: Record<string, unknown> } | null)?.categoryAvailability || {}
		const industrySlug = store.industry?.slug || "general"
		const storedSlugs = store.categories.map((category) => category.slug)
		const categorySlugs = new Set<string>(storedSlugs)
		if (store.ownerType === "MERCHANT" && industrySlug !== "electronics") {
			for (const category of store.industry?.categoryTemplates || []) categorySlugs.add(category.slug)
		} else if (store.ownerType === "MERCHANT" && storedSlugs.length === 0) {
			for (const category of clientConfig.homepage.categories) categorySlugs.add(category.slug)
		}
		for (const slug of Array.from(categorySlugs)) {
			if (availability[`${industrySlug}:${slug}`] === false || availability[slug] === false) continue
			urls.add(`${origin}/category/${encodeURIComponent(slug)}`)
		}
	}
	return Array.from(urls).sort()
}

export async function getSitemapRanges() {
	const [stores, products, categories, articles] = await Promise.all([
		prisma.store.count({ where: publicStoreWhere }),
		prisma.product.count({ where: { isPublished: true, store: { is: publicStoreWhere }, category: { is: publicProductCategoryWhere } } }),
		getPublicCategoryUrls(),
		prisma.blogPost.count({
			where: {
				status: "PUBLISHED", publishedAt: { not: null },
				OR: [
					{ tenantId: null, scopeKey: "platform" },
					{ tenant: { is: publicBlogTenantWhere }, scopeKey: { not: "platform" } },
				],
			},
		}),
	])
	const counts: Counts = { stores, products, categories: categories.length, articles }
	return rangesFromCounts(counts)
}

export function getSitemapIndexXml(pageCount: number) {
	const children = Array.from({ length: pageCount + 1 }, (_, id) => `<sitemap><loc>${xmlEscape(`${platformOrigin()}/sitemap/${id}.xml`)}</loc></sitemap>`).join("")
	return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${children}</sitemapindex>`
}

function xmlEscape(value: string) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")
}

function toUrlSet(entries: SitemapEntry[]) {
	const urls = entries.map(({ url, lastModified }) => `<url><loc>${xmlEscape(url)}</loc>${lastModified ? `<lastmod>${lastModified.toISOString()}</lastmod>` : ""}</url>`).join("")
	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}

function fixedEntries(): SitemapEntry[] {
	const origin = platformOrigin()
	return [
		"/", "/stores", "/about", "/contact", "/faqs", "/terms", "/privacy-policy",
		"/cookie-policy", "/return-policy", "/warranty", "/blog", "/compare",
	].map((path) => ({ url: new URL(path, origin).toString() }))
}

export async function getSitemapXml(id: number) {
	if (!Number.isInteger(id) || id < 0) return toUrlSet([])
	if (id === 0) return toUrlSet(fixedEntries())

	try {
		const ranges = await getSitemapRanges()
		const range = ranges.find((item) => id >= item.firstId && id < item.firstId + item.pages)
		if (!range) return toUrlSet([])
		const skip = (id - range.firstId) * (range.group === "stores" ? STORE_PAGE_SIZE : SITEMAP_PAGE_SIZE)

		if (range.group === "stores") {
			const stores = await prisma.store.findMany({
				where: publicStoreWhere,
				orderBy: { id: "asc" },
				skip,
				take: STORE_PAGE_SIZE,
				select: {
					slug: true,
					updatedAt: true,
					products: { where: { isPublished: true, category: { is: publicProductCategoryWhere } }, take: 1, select: { id: true } },
				},
			})
			return toUrlSet(stores.flatMap((store) => {
				const origin = storeOrigin(store.slug)
				return origin ? [
					{ url: `${origin}/`, lastModified: store.updatedAt },
					...(store.products.length > 0 ? [{ url: `${origin}/products` }] : []),
					{ url: `${origin}/blog` },
				] : []
			}))
		}

		if (range.group === "products") {
			const products = await prisma.product.findMany({
				where: { isPublished: true, store: { is: publicStoreWhere }, category: { is: publicProductCategoryWhere } },
				orderBy: [{ tenantId: "asc" }, { slug: "asc" }], skip, take: SITEMAP_PAGE_SIZE,
				select: { slug: true, updatedAt: true, category: { select: { slug: true } }, store: { select: { slug: true, commerceSettings: true } } },
			})
			return toUrlSet(products.flatMap((product) => {
				const origin = product.store ? storeOrigin(product.store.slug) : null
				const commerce = product.store?.commerceSettings && typeof product.store.commerceSettings === "object" && !Array.isArray(product.store.commerceSettings)
					? product.store.commerceSettings as { categoryAvailability?: Record<string, unknown> }
					: {}
				if (commerce.categoryAvailability?.[product.category.slug] === false) return []
				return origin ? [{ url: `${origin}/products/${encodeURIComponent(product.slug)}`, lastModified: product.updatedAt }] : []
			}))
		}

		if (range.group === "categories") {
			return toUrlSet((await getPublicCategoryUrls()).slice(skip, skip + SITEMAP_PAGE_SIZE).map((url) => ({ url })))
		}

		const articles = await prisma.blogPost.findMany({
			where: {
				status: "PUBLISHED", publishedAt: { not: null },
				OR: [
					{ tenantId: null, scopeKey: "platform" },
					{ tenant: { is: publicBlogTenantWhere }, scopeKey: { not: "platform" } },
				],
			},
			orderBy: [{ tenantId: "asc" }, { slug: "asc" }], skip, take: SITEMAP_PAGE_SIZE,
			select: { slug: true, scopeKey: true, tenantId: true, updatedAt: true, tenant: { select: { store: { select: { slug: true } } } } },
		})
		return toUrlSet(articles.filter((article) => article.tenantId === null || article.scopeKey === article.tenantId).flatMap((article) => {
			const origin = article.tenant ? storeOrigin(article.tenant.store?.slug || "") : platformOrigin()
			return origin ? [{ url: `${origin}/blog/${encodeURIComponent(article.slug)}`, lastModified: article.updatedAt }] : []
		}))
	} catch (error) {
		console.error(`Sitemap page ${id} could not be generated`, error)
		return toUrlSet([])
	}
}

export function sitemapCacheHeaders() {
	return { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": `public, s-maxage=${SITEMAP_REVALIDATE_SECONDS}, stale-while-revalidate=86400` }
}
