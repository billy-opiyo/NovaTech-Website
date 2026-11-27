import ProductDetailPage, { type Product } from "./ProductDetailsClient"
import NotFoundState from "@/components/content/NotFoundState"
import { getStoreRequestTenantContext } from "@/lib/store-context.server"
import { getCachedProductBySlug } from "@/lib/public-catalog.server"

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
	const [{ slug }, context] = await Promise.all([params, getStoreRequestTenantContext()])
	const result = await getCachedProductBySlug(slug, context).catch(() => null)
	if (!result) return <NotFoundState title="Product not found" description="We could not find that product. It may have been removed or the link may be out of date." />
	const product = JSON.parse(JSON.stringify(result)) as Product
	return <ProductDetailPage product={product} />
}
