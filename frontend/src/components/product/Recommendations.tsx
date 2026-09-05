"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Star } from "lucide-react"
import { getProductImage } from "@/constants/productImages"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"
import { getMerchantWhatsAppHref } from "@/lib/merchant-contact"
import ProductActions from "@/components/product/ProductActions"

type Recommendation = {
	id: string
	name: string
	slug: string
	price: number
	discountedPrice?: number
	images: string[]
	brand: string
	rating: number
	reviewCount: number
	stock: number
	hasVariants?: boolean
}

export default function Recommendations({ productId }: { productId: string }) {
	const [products, setProducts] = useState<Recommendation[]>([])
	const store = useStoreContext()
	const [state, setState] = useState<"loading" | "ready" | "error">("loading")

	useEffect(() => {
		const controller = new AbortController()
		setState("loading")
		fetch(getStoreRouteHref(store, `/api/recommendations?type=similar&productId=${encodeURIComponent(productId)}&limit=4`), { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error("Unable to load recommendations")
				return response.json() as Promise<{ products: Recommendation[] }>
			})
			.then((data) => { setProducts(data.products || []); setState("ready") })
			.catch((reason: Error) => { if (reason.name !== "AbortError") setState("error") })
		return () => controller.abort()
	}, [productId, store])

	if (state === "loading") return <section className="border-t border-gray-200 pt-8 dark:border-gray-700"><h2 className="mb-5 text-2xl font-bold">You may also like</h2><p className="text-sm text-gray-500">Loading recommendations…</p></section>
	if (state === "error") return null
	if (!products.length) return null

	return (
		<section className="border-t border-gray-200 pt-8 dark:border-gray-700">
			<div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="text-2xl font-bold">You may also like</h2><p className="mt-1 text-sm text-gray-500">Similar products selected for this item</p></div><Link href={getStoreRouteHref(store, "/products")} className="text-sm font-medium text-primary hover:underline">Browse all</Link></div>
			<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <article key={product.id} className="glass-card relative overflow-hidden"><Link href={getStoreRouteHref(store, `/products/${product.slug}`)} className="block pb-24"><div className="relative aspect-square bg-gray-100 dark:bg-gray-800"><Image src={getProductImage(product.images[0], product.name)} alt={product.name} fill className="object-cover" /></div><div className="p-4"><p className="line-clamp-2 min-h-10 font-semibold">{product.name}</p><div className="mt-2 flex items-center gap-1 text-sm text-gray-500"><Star size={14} className="fill-yellow-500 text-yellow-500" />{product.rating > 0 ? product.rating.toFixed(1) : "New"}<span>({product.reviewCount})</span></div><div className="mt-3 flex items-baseline gap-2"><span className="font-bold text-primary">KES {(product.discountedPrice ?? product.price).toLocaleString()}</span>{product.discountedPrice && <span className="text-xs text-gray-400 line-through">KES {product.price.toLocaleString()}</span>}</div></div></Link><div className="absolute inset-x-3 bottom-3"><ProductActions productId={product.id} name={product.name} brand={product.brand} image={product.images[0]} price={product.discountedPrice ?? product.price} stock={product.stock} slug={product.slug} hasVariants={product.hasVariants} merchantHref={getMerchantWhatsAppHref({ number: store.contact.whatsappNumber, storeName: store.brand.name, items: [{ name: product.name, price: product.discountedPrice ?? product.price }] })} /></div></article>)}</div>
		</section>
	)
}
