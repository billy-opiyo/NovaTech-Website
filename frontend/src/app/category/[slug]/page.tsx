"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowRight, Star } from "lucide-react"
import { getProductImage } from "@/constants/productImages"
import NotFoundState from "@/components/content/NotFoundState"
import ProductActions from "@/components/product/ProductActions"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"
import { getMerchantWhatsAppHref } from "@/lib/merchant-contact"
import type { StoreContext } from "@/lib/store-context.types"

const categoryData: Record<string, { title: string; description: string }> = {
	phones: {
		title: "Smartphones",
		description: "Discover the latest smartphones from top brands. 5G, great cameras, and amazing deals.",
	},
	laptops: {
		title: "Laptops",
		description: "Powerful laptops for work, gaming, and creativity. Find your perfect match.",
	},
	tablets: {
		title: "Tablets",
		description: "Versatile tablets for entertainment, productivity, and creativity.",
	},
	accessories: {
		title: "Accessories",
		description: "Essential accessories for your devices. Cases, chargers, headphones, and more.",
	},
	gaming: {
		title: "Gaming",
		description: "Level up your gaming setup with consoles, gaming PCs, and accessories.",
	},
}

type CategoryProduct = {
	id: string
	name: string
	slug: string
	brand: string
	price: number
	discountedPrice?: number | null
	stock: number
	images: string[]
	variants?: { id: string; stock: number }[]
	averageRating?: number
	reviewCount?: number
}

type StoreLinkContext = Pick<StoreContext, "isPlatformHome" | "storePathPrefix" | "storeSlug" | "contact" | "brand">

function ProductCard({ product, store }: { product: CategoryProduct; store: StoreLinkContext }) {
	const price = product.discountedPrice ?? product.price
	const merchantHref = getMerchantWhatsAppHref({
		number: store.contact.whatsappNumber,
		storeName: store.brand.name,
		items: [{ name: product.name, price }],
	})

	return (
		<article className="glass-card relative overflow-hidden">
			<Link href={getStoreRouteHref(store, `/products/${product.slug}`)} className="group block pb-24">
				<div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
					<Image
						src={getProductImage(product.images[0], product.name)}
						alt={product.name}
						fill
						className="object-cover transition-transform duration-500 group-hover:scale-105"
					/>
				</div>
				<div className="p-4">
					<p className="line-clamp-2 min-h-10 font-semibold">{product.name}</p>
					<p className="mt-1 text-sm text-gray-500">{product.brand}</p>
					<div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
						<Star size={14} className="fill-yellow-500 text-yellow-500" />
						{product.averageRating && product.averageRating > 0 ? product.averageRating.toFixed(1) : "New"}
						<span>({product.reviewCount || 0})</span>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="font-bold text-primary">KES {price.toLocaleString()}</span>
						{product.discountedPrice != null && <span className="text-xs text-gray-400 line-through">KES {product.price.toLocaleString()}</span>}
					</div>
				</div>
			</Link>
			<div className="absolute inset-x-3 bottom-3">
				<ProductActions
					productId={product.id}
					name={product.name}
					brand={product.brand}
					image={product.images[0]}
					price={price}
					stock={product.stock}
					slug={product.slug}
					hasVariants={Boolean(product.variants?.length)}
					merchantHref={merchantHref}
				/>
			</div>
		</article>
	)
}

export default function CategoryPage() {
	const { slug } = useParams<{ slug: string }>()
	const store = useStoreContext()
	const category = categoryData[slug]
	const [catalogProducts, setCatalogProducts] = useState<CategoryProduct[]>([])
	const [trendingProducts, setTrendingProducts] = useState<CategoryProduct[]>([])
	const [loadingProducts, setLoadingProducts] = useState(true)

	useEffect(() => {
		if (!category) return
		const controller = new AbortController()
		const query = `category=${encodeURIComponent(slug)}&limit=4&sortBy=newest`
		setLoadingProducts(true)
		Promise.all([
			fetch(getStoreRouteHref(store, `/api/products?${query}`), { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject(new Error("Products unavailable"))),
			fetch(getStoreRouteHref(store, `/api/products?${query}&trending=true`), { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject(new Error("Trending products unavailable"))),
		])
			.then(([catalogBody, trendingBody]) => {
				setCatalogProducts(catalogBody.products || [])
				setTrendingProducts(trendingBody.products || [])
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return
				setCatalogProducts([])
				setTrendingProducts([])
			})
			.finally(() => setLoadingProducts(false))
		return () => controller.abort()
	}, [category, slug, store])

	if (!category) return <NotFoundState title="Category not found" description="That product category is not available. Explore the full Nurava Tech catalogue instead." />

	return (
		<div>
			<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card mb-12 p-8 text-center md:p-16">
				<h1 className="mb-4 text-3xl font-bold md:text-5xl">{category.title}</h1>
				<p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300">{category.description}</p>
				<Link href={getStoreRouteHref(store, `/products?category=${slug}`)} className="btn-primary inline-flex items-center gap-2">
					Browse All <ArrowRight size={18} />
				</Link>
			</motion.div>

			<section className="mb-16">
				<div className="mb-8 flex items-center justify-between gap-4">
					<h2 className="text-2xl font-bold">Latest in {category.title}</h2>
					<Link href={getStoreRouteHref(store, `/products?category=${slug}`)} className="flex items-center gap-1 text-primary hover:underline">
						View All <ArrowRight size={16} />
					</Link>
				</div>
				{loadingProducts ? <p className="glass-card p-8 text-center text-gray-500">Loading products…</p> : catalogProducts.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{catalogProducts.map((product) => <ProductCard key={product.id} product={product} store={store} />)}</div> : <p className="glass-card p-8 text-center text-gray-500">No products have been added to this category yet.</p>}
			</section>

			<section>
				<div className="mb-8 flex items-center justify-between gap-4">
					<h2 className="text-2xl font-bold">Trending in {category.title}</h2>
					<Link href={getStoreRouteHref(store, `/products?category=${slug}&trending=true`)} className="flex items-center gap-1 text-primary hover:underline">
						View All <ArrowRight size={16} />
					</Link>
				</div>
				{loadingProducts ? <p className="glass-card p-8 text-center text-gray-500">Loading trending products…</p> : trendingProducts.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{trendingProducts.map((product) => <ProductCard key={product.id} product={product} store={store} />)}</div> : <p className="glass-card p-8 text-center text-gray-500">No products have been marked Trending in this category yet.</p>}
			</section>
		</div>
	)
}
