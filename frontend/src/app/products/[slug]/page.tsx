import type { Metadata } from "next"
import ProductDetailPage, { type Product } from "./ProductDetailsClient"
import NotFoundState from "@/components/content/NotFoundState"
import { getStoreContext, getStoreRequestTenantContext } from "@/lib/store-context.server"
import { getCachedProductBySlug } from "@/lib/public-catalog.server"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const [{ slug }, context, store] = await Promise.all([params, getStoreRequestTenantContext(), getStoreContext()])
	const product = await getCachedProductBySlug(slug, context).catch(() => null)
	if (!product) return { title: "Product not found", robots: { index: false, follow: false } }
	const title = `${product.name} | ${product.category.name}`
	const description = (product.description?.trim() || `${product.name} is available from ${store.brand.name}.`).slice(0, 320)
	const image = Array.isArray(product.images) ? product.images.find((value) => typeof value === "string" && value.trim()) : undefined
	return { title, description, openGraph: { title, description, ...(image ? { images: [image] } : {}) }, twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) } }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
	const [{ slug }, context] = await Promise.all([params, getStoreRequestTenantContext()])
	const result = await getCachedProductBySlug(slug, context).catch(() => null)
	if (!result) return <NotFoundState title="Product not found" description="We could not find that product. It may have been removed or the link may be out of date." />
	const product = JSON.parse(JSON.stringify(result)) as Product
	return <ProductDetailPage product={product} />
}
