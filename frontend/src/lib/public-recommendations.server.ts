import { unstable_cache } from "next/cache"
import {
	getDeals,
	getFeaturedProducts,
	getNewArrivals,
	getPlatformStoreHomepageProducts,
	getSimilarProducts,
	getTrendingProducts,
} from "backend/services/recommendation.service"
import { publicCatalogTag, publicRecommendationTag } from "@/lib/public-catalog.server"

// Public recommendation data is tenant-scoped by the function arguments. Keep
// freshness short so stock and catalogue edits appear quickly; personalized
// recommendations deliberately stay outside this cache.
export function getCachedTrendingProducts(tenantId: string, limit = 12) {
	return unstable_cache(() => getTrendingProducts(tenantId, limit), ["public-trending-products-v2", tenantId, String(limit)], { revalidate: 20, tags: [publicRecommendationTag(tenantId)] })()
}

export function getCachedSimilarProducts(productId: string, tenantId: string, limit = 8) {
	return unstable_cache(() => getSimilarProducts(productId, tenantId, limit), ["public-similar-products-v2", tenantId, productId, String(limit)], { revalidate: 20, tags: [publicRecommendationTag(tenantId)] })()
}

export function getCachedFeaturedProducts(tenantId: string, limit = 12) {
	return unstable_cache(() => getFeaturedProducts(tenantId, limit), ["public-featured-products-v2", tenantId, String(limit)], { revalidate: 20, tags: [publicRecommendationTag(tenantId)] })()
}

export function getCachedNewArrivals(tenantId: string, limit = 12) {
	return unstable_cache(() => getNewArrivals(tenantId, limit), ["public-new-arrivals-v2", tenantId, String(limit)], { revalidate: 20, tags: [publicRecommendationTag(tenantId)] })()
}

export function getCachedDeals(tenantId: string, limit = 12) {
	return unstable_cache(() => getDeals(tenantId, limit), ["public-product-deals-v2", tenantId, String(limit)], { revalidate: 20, tags: [publicRecommendationTag(tenantId)] })()
}

export function getCachedPlatformStoreHomepageProducts() {
	return unstable_cache(getPlatformStoreHomepageProducts, ["public-platform-store-home-products-v2"], { revalidate: 20, tags: [publicCatalogTag("platform-store")] })()
}
