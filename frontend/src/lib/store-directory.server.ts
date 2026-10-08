import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { clientConfig } from "@/config/client.config"
import { getPlatformDomain } from "backend/lib/platform-domain"
import { getStorePublicHref, resolveDirectoryStoreLogo } from "./platform-store-route"

export type PublishedStoreDirectoryEntry = {
	id: string
	name: string
	slug: string
	logoUrl: string | null
	tagline: string
	industry: { name: string; slug: string } | null
	featuredProduct: { name: string; slug: string; price: number; image: string | null } | null
}

export type PlatformDiscoveryProduct = {
	name: string
	slug: string
	price: number
	image: string | null
	brand: string
}

export type PlatformDiscoveryStore = {
	id: string
	name: string
	slug: string
	logoUrl: string | null
	tagline: string
	averageRating: number
	reviewCount: number
	productCount: number
	products: PlatformDiscoveryProduct[]
	category: "TOP_RATED" | "MOST_REVIEWED" | "NEW_AND_GROWING"
	industry: { name: string; slug: string } | null
	isDemo: boolean
}

const jsonRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

export async function getPublishedStores(): Promise<PublishedStoreDirectoryEntry[]> {
	try {
		const stores = await prisma.store.findMany({
			where: {
				publicationStatus: "PUBLISHED",
				tenant: { status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] }, verificationStatus: "APPROVED" },
			},
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				slug: true,
				logoUrl: true,
				homepageSettings: true,
				industry: { select: { name: true, slug: true } },
				tenant: {
					select: {
						products: {
							where: { isFeatured: true },
							orderBy: { updatedAt: "desc" },
							take: 1,
							select: { name: true, slug: true, price: true, discountedPrice: true, images: true },
						},
					},
				},
			},
		})

		return stores.map((store) => {
			const homepage = jsonRecord(store.homepageSettings)
			const tagline = typeof homepage.heroDescription === "string" ? homepage.heroDescription : "Explore this store's products and offers."
			const product = store.tenant.products[0]
			return {
				id: store.id,
				name: store.name,
				slug: store.slug,
				logoUrl: resolveDirectoryStoreLogo(store.slug, store.logoUrl, clientConfig.brand.logo),
				tagline,
				industry: store.industry,
				featuredProduct: product ? {
					name: product.name,
					slug: product.slug,
					price: product.discountedPrice ?? product.price,
					image: product.images[0] || null,
				} : null,
			}
		})
	} catch (error) {
		if (process.env.NODE_ENV === "production") {
			console.error("Store directory unavailable", error)
			return []
		}

		return [{
			id: "novatech-store",
			name: clientConfig.brand.name,
			slug: "nuravatech",
			logoUrl: clientConfig.brand.logo,
			tagline: clientConfig.homepage.heroDescription,
			industry: null,
			featuredProduct: null,
		}]
	}
}

export async function getPlatformDiscoveryStores(): Promise<PlatformDiscoveryStore[]> {
	try {
		const stores = await prisma.store.findMany({
			where: {
				publicationStatus: "PUBLISHED",
				tenant: { status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] }, verificationStatus: "APPROVED" },
			},
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				slug: true,
				logoUrl: true,
				homepageSettings: true,
				industry: { select: { name: true, slug: true } },
				tenant: {
					select: {
						id: true,
						_count: { select: { products: true } },
						products: {
							orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
							take: 3,
							select: { name: true, slug: true, brand: true, price: true, discountedPrice: true, images: true },
						},
					},
				},
			},
		})
		const tenantIds = stores.map((store) => store.tenant.id)
		const reviewGroups = tenantIds.length
			? await prisma.review.groupBy({ by: ["tenantId"], where: { tenantId: { in: tenantIds }, moderationStatus: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } })
			: []
		const reviewByTenant = new Map(reviewGroups.map((group) => [group.tenantId, { averageRating: group._avg.rating || 0, reviewCount: group._count._all }]))
		const maxReviewByIndustry = new Map<string, number>()
		for (const store of stores) {
			const reviewCount = reviewByTenant.get(store.tenant.id)?.reviewCount || 0
			const industryKey = store.industry?.slug || "unclassified"
			maxReviewByIndustry.set(industryKey, Math.max(maxReviewByIndustry.get(industryKey) || 0, reviewCount))
		}

		return stores.map((store) => {
			const homepage = jsonRecord(store.homepageSettings)
			const review = reviewByTenant.get(store.tenant.id) || { averageRating: 0, reviewCount: 0 }
			const category = review.reviewCount === 0
				? "NEW_AND_GROWING"
				: review.averageRating >= 4.5 && review.reviewCount >= 3
					? "TOP_RATED"
					: review.reviewCount === (maxReviewByIndustry.get(store.industry?.slug || "unclassified") || 0) && review.reviewCount > 0
						? "MOST_REVIEWED"
						: "NEW_AND_GROWING"
			return {
				id: store.id,
				name: store.name,
				slug: store.slug,
				logoUrl: resolveDirectoryStoreLogo(store.slug, store.logoUrl, clientConfig.brand.logo),
				tagline: typeof homepage.heroDescription === "string" ? homepage.heroDescription : "Explore this store's catalogue and merchant offers.",
				averageRating: Math.round(review.averageRating * 10) / 10,
				reviewCount: review.reviewCount,
				productCount: store.tenant._count.products,
				products: store.tenant.products.map((product) => ({ name: product.name, slug: product.slug, brand: product.brand, price: product.discountedPrice ?? product.price, image: product.images[0] || null })),
				category,
				industry: store.industry,
				isDemo: ["nuravatech", "nurava-furnitures", "nurava-cakes"].includes(store.slug),
			}
		})
	} catch (error) {
		if (process.env.NODE_ENV === "production") console.error("Platform store discovery unavailable", error)
		return []
	}
}

export async function getStorePublicUrl(slug: string): Promise<string> {
	const requestHeaders = await headers()
	const host = requestHeaders.get("host") || "localhost:3000"
	return getStorePublicHref(slug, host, getPlatformDomain())
}
