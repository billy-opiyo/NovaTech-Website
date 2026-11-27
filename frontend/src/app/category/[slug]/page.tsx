import CategoryPage, { type CategoryProduct } from "./CategoryClient"
import { getStoreRequestTenantContext } from "@/lib/store-context.server"
import { getCachedFilteredProducts } from "@/lib/public-catalog.server"

export default async function StoreCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
	const [{ slug }, context] = await Promise.all([params, getStoreRequestTenantContext()])
	const category = slug.trim().toLowerCase()
	const latestQuery = new URLSearchParams({ category, limit: "4", sortBy: "newest" })
	const trendingQuery = new URLSearchParams({ category, limit: "4", sortBy: "newest", trending: "true" })
	const [latest, trending] = await Promise.all([
		getCachedFilteredProducts(latestQuery, context, { includeReviewDetails: false }).catch(() => ({ products: [] })),
		getCachedFilteredProducts(trendingQuery, context, { includeReviewDetails: false }).catch(() => ({ products: [] })),
	])
	const catalogProducts = JSON.parse(JSON.stringify(latest.products)) as CategoryProduct[]
	const trendingProducts = JSON.parse(JSON.stringify(trending.products)) as CategoryProduct[]
	return <CategoryPage catalogProducts={catalogProducts} trendingProducts={trendingProducts} />
}
