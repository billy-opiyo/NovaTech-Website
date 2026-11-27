import { Suspense } from "react"
import ProductsClient from "./ProductsClient"
import { getStoreRequestTenantContext } from "@/lib/store-context.server"
import { getCachedFilteredProducts } from "@/lib/public-catalog.server"

type SearchParams = Record<string, string | string[] | undefined>

function toSearchParams(values: SearchParams) {
	const params = new URLSearchParams()
	for (const [key, value] of Object.entries(values)) {
		if (typeof value === "string") params.set(key, value)
		else if (Array.isArray(value)) for (const item of value) params.append(key, item)
	}
	if (!params.has("limit")) params.set("limit", "12")
	return params
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
	const [context, queryValues] = await Promise.all([getStoreRequestTenantContext(), searchParams])
	const result = await getCachedFilteredProducts(toSearchParams(queryValues), context, { includeReviewDetails: false }).catch(() => ({ products: [], total: 0, page: 1, totalPages: 0 }))
	return (
		<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading products…</div>}>
			<ProductsClient initialProducts={result.products} initialTotal={result.total} initialTotalPages={result.totalPages} initialPage={result.page} />
		</Suspense>
	)
}
