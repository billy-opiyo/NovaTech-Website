import { unstable_cache } from "next/cache"
import {
	getDeals,
	getFeaturedProducts,
	getNewArrivals,
	getPlatformStoreHomepageProducts,
	getSimilarProducts,
	getTrendingProducts,
} from "backend/services/recommendation.service"

// Public recommendation data is tenant-scoped by the function arguments. Keep
// freshness short so stock and catalogue edits appear quickly; personalized
// recommendations deliberately stay outside this cache.
export const getCachedTrendingProducts = unstable_cache(getTrendingProducts, ["public-trending-products-v1"], { revalidate: 30 })
export const getCachedSimilarProducts = unstable_cache(getSimilarProducts, ["public-similar-products-v1"], { revalidate: 30 })
export const getCachedFeaturedProducts = unstable_cache(getFeaturedProducts, ["public-featured-products-v1"], { revalidate: 30 })
export const getCachedNewArrivals = unstable_cache(getNewArrivals, ["public-new-arrivals-v1"], { revalidate: 30 })
export const getCachedDeals = unstable_cache(getDeals, ["public-product-deals-v1"], { revalidate: 30 })
export const getCachedPlatformStoreHomepageProducts = unstable_cache(getPlatformStoreHomepageProducts, ["public-platform-store-home-products-v1"], { revalidate: 30 })
