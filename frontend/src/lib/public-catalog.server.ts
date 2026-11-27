import { unstable_cache, revalidateTag } from "next/cache"
import type { TenantContext } from "backend/lib/tenant"
import { getFilteredProducts, getProductBySlug } from "backend/services/productService"

export const publicCatalogTag = (storeId: string) => `public-catalog:${storeId}`
export const publicRecommendationTag = (tenantId: string) => `public-recommendations:${tenantId}`
export const publicStoreContextTag = (storeId: string) => `public-store-context:${storeId}`
export const PUBLIC_DIRECTORY_TAG = "public-store-directory"
export const PLATFORM_DISCOVERY_TAG = "platform-store-discovery"
export const PUBLIC_INDUSTRY_TAG = "public-industry-taxonomy"

const cacheableQueryKeys = ["category", "industry", "brands", "minPrice", "maxPrice", "q", "search", "inStock", "onSale", "featured", "newArrivals", "trending", "sortBy", "page", "limit"]

function normalizeCatalogQuery(search: URLSearchParams) {
	const normalized = new URLSearchParams()
	for (const key of cacheableQueryKeys) {
		const value = search.get(key)
		if (value !== null) normalized.set(key, value)
	}
	normalized.sort()
	return normalized.toString()
}

function contextKey(context: TenantContext) {
	return [context.tenantId, context.storeId, context.ownerType, JSON.stringify(context.commerceSettings ?? null)]
}

/** Short-lived public catalog results; the store ID is part of every key and tag. */
export async function getCachedFilteredProducts(search: URLSearchParams, context: TenantContext, options: { includeReviewDetails?: boolean } = {}) {
	const query = normalizeCatalogQuery(search)
	const key = [...contextKey(context), query]
	const includeReviewDetails = options.includeReviewDetails !== false
	return unstable_cache(
		() => getFilteredProducts(new URLSearchParams(query), context.tenantId, context, { includeReviewDetails }),
		["public-filtered-products-v3", ...key, includeReviewDetails ? "with-review-details" : "catalog-card-data"],
		{ revalidate: 20, tags: [publicCatalogTag(context.storeId), publicRecommendationTag(context.tenantId)] },
	)()
}

/** Public product details use the same tenant/store boundary as catalog pages. */
export async function getCachedProductBySlug(slug: string, context: TenantContext) {
	return unstable_cache(
		() => getProductBySlug(slug, context.tenantId, context),
		["public-product-detail-v2", ...contextKey(context), slug],
		{ revalidate: 20, tags: [publicCatalogTag(context.storeId), publicRecommendationTag(context.tenantId)] },
	)()
}

type PublicCatalogRevalidationOptions = {
	storeContext?: boolean
	storeDirectory?: boolean
	platformDiscovery?: boolean
	platformStoreHomepage?: boolean
}

/** Invalidate only the public data affected by a successful mutation. */
export function revalidateTenantPublicCatalog(
	context: Pick<TenantContext, "tenantId" | "storeId"> & Partial<Pick<TenantContext, "ownerType">>,
	options: PublicCatalogRevalidationOptions = {},
) {
	revalidateTag(publicCatalogTag(context.storeId))
	revalidateTag(publicRecommendationTag(context.tenantId))
	if (options.storeContext) revalidateTag(publicStoreContextTag(context.storeId))
	if (options.storeDirectory) revalidateTag(PUBLIC_DIRECTORY_TAG)
	if (options.platformDiscovery) revalidateTag(PLATFORM_DISCOVERY_TAG)
	if (options.platformStoreHomepage && context.ownerType === "PLATFORM") revalidateTag(publicCatalogTag("platform-store"))
}

/** Stock and order changes affect public availability and sales recommendations. */
export function revalidateTenantInventory(context: Pick<TenantContext, "tenantId" | "storeId">) {
	revalidateTag(publicCatalogTag(context.storeId))
	revalidateTag(publicRecommendationTag(context.tenantId))
}

export function revalidatePublicIndustryData() {
	revalidateTag(PUBLIC_INDUSTRY_TAG)
}
