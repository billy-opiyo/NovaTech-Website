"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertCircle, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Star } from "lucide-react"
import { getProductImage } from "@/constants/productImages"
import { useCart } from "@/lib/cartContext"
import NotFoundState from "@/components/content/NotFoundState"

type Variant = { name: string; value: string; priceModifier?: number | null; stock: number }
type Review = {
	id: string
	user?: { name?: string | null; image?: string | null }
	rating: number
	title?: string | null
	comment?: string | null
	createdAt: string
	verified: boolean
}
type Product = {
	id: string
	name: string
	slug: string
	description: string
	brand: string
	sku: string
	price: number
	discountedPrice?: number | null
	stock: number
	warranty?: string | null
	images: string[]
	category: { name: string; slug: string }
	averageRating: number
	reviewCount: number
	specs?: Record<string, unknown> | null
	variants: Variant[]
	reviews: Review[]
}

export default function ProductDetailPage() {
	const { slug } = useParams<{ slug: string }>()
	const { addItem } = useCart()
	const [product, setProduct] = useState<Product | null>(null)
	const [error, setError] = useState("")
	const [selectedImage, setSelectedImage] = useState(0)
	const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
	const [quantity, setQuantity] = useState(1)
	const [added, setAdded] = useState(false)

	useEffect(() => {
		if (!slug) return
		setError("")
		fetch(`/api/products/${encodeURIComponent(slug)}`)
			.then(async (response) => {
				if (!response.ok) throw new Error("Product not found")
				return response.json()
			})
			.then((data) => setProduct(data))
			.catch((reason) => setError(reason.message || "Unable to load product"))
	}, [slug])

	if (error) return <NotFoundState title="Product not found" description="We could not find that product. It may have been removed or the link may be out of date." />
	if (!product) return <div className="mx-auto max-w-7xl py-20 text-center text-gray-500">Loading product…</div>
	const loadedProduct = product

	const currentPrice = product.variants.reduce((price, variant) => {
		if (selectedVariants[variant.name] !== variant.value) return price
		return price + (variant.priceModifier || 0)
	}, product.discountedPrice ?? product.price)

	const groupedVariants = product.variants.reduce<Record<string, Variant[]>>((groups, variant) => {
		(groups[variant.name] ||= []).push(variant)
		return groups
	}, {})
	const selectedStock = product.variants
		.filter((variant) => selectedVariants[variant.name] === variant.value)
		.reduce((stock, variant) => Math.min(stock, variant.stock), product.stock)

	function handleAddToCart() {
		addItem({
			productId: loadedProduct.id,
			name: loadedProduct.name,
			brand: loadedProduct.brand,
			image: loadedProduct.images[0] || "/placeholder-product.jpg",
			price: currentPrice,
			quantity,
			variant: Object.values(selectedVariants).join(" / ") || undefined,
			maxStock: selectedStock,
			slug: loadedProduct.slug,
		})
		setAdded(true)
		setTimeout(() => setAdded(false), 2500)
	}

	return (
		<div className="mx-auto max-w-7xl space-y-10 py-6">
			<nav className="flex items-center gap-2 text-sm text-gray-500">
				<Link href="/products">Products</Link><ChevronRight size={14} />
				<Link href={`/category/${product.category.slug}`}>{product.category.name}</Link><ChevronRight size={14} />
				<span className="text-gray-900 dark:text-white">{product.name}</span>
			</nav>

			<section className="grid gap-8 lg:grid-cols-2">
				<div>
					<div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
						<Image src={getProductImage(product.images[selectedImage], product.name)} alt={product.name} fill className="object-contain" priority />
						{product.images.length > 1 && <>
							<button aria-label="Previous image" onClick={() => setSelectedImage((selectedImage + product.images.length - 1) % product.images.length)} className="absolute left-3 top-1/2 rounded-full bg-black/40 p-2 text-white"><ChevronLeft /></button>
							<button aria-label="Next image" onClick={() => setSelectedImage((selectedImage + 1) % product.images.length)} className="absolute right-3 top-1/2 rounded-full bg-black/40 p-2 text-white"><ChevronRight /></button>
						</>}
					</div>
					<div className="mt-3 flex gap-3 overflow-auto">
						{product.images.map((image, index) => <button key={image} onClick={() => setSelectedImage(index)} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${selectedImage === index ? "border-primary" : "border-transparent"}`}><Image src={getProductImage(image, product.name)} alt={`${product.name} ${index + 1}`} fill className="object-cover" /></button>)}
					</div>
				</div>

				<div className="space-y-5">
					<p className="text-sm font-medium uppercase tracking-wider text-primary">{product.brand}</p>
					<h1 className="text-3xl font-bold sm:text-4xl">{product.name}</h1>
					<p className="text-sm text-gray-500">SKU: {product.sku}</p>
					<div className="flex items-center gap-2"><Star size={18} className="fill-yellow-500 text-yellow-500" /><span>{product.averageRating.toFixed(1)}</span><span className="text-gray-500">({product.reviewCount} reviews)</span></div>
					<div className="flex items-baseline gap-3"><span className="text-3xl font-bold text-primary">KES {currentPrice.toLocaleString()}</span>{product.discountedPrice && <span className="text-lg text-gray-400 line-through">KES {product.price.toLocaleString()}</span>}</div>
					<p className="flex items-center gap-2 text-sm">{selectedStock > 0 ? <><span className="h-2 w-2 rounded-full bg-green-500" />{selectedStock} available</> : <><AlertCircle size={16} className="text-red-500" />Out of stock</>}</p>

					{Object.entries(groupedVariants).map(([name, variants]) => <div key={name}><h2 className="mb-2 font-semibold">{name}</h2><div className="flex flex-wrap gap-2">{variants.map((variant) => <button key={variant.value} disabled={variant.stock < 1} onClick={() => setSelectedVariants({ ...selectedVariants, [name]: variant.value })} className={`rounded-lg border px-3 py-2 text-sm ${selectedVariants[name] === variant.value ? "border-primary bg-primary text-white" : "border-gray-300"} disabled:cursor-not-allowed disabled:opacity-40`}>{variant.value}</button>)}</div></div>)}

					<div className="flex items-center gap-3"><div className="flex items-center rounded-lg border"><button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3"><Minus size={16} /></button><span className="w-10 text-center">{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(Math.min(selectedStock, quantity + 1))} className="p-3"><Plus size={16} /></button></div><button onClick={handleAddToCart} disabled={selectedStock < 1} className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-50"><ShoppingCart size={18} />{added ? "Added to cart" : "Add to cart"}</button></div>
					<p className="text-gray-600 dark:text-gray-300">{product.description}</p>
				</div>
			</section>

			<section className="grid gap-8 lg:grid-cols-2">
				<div className="glass-card p-6"><h2 className="mb-4 text-xl font-semibold">Specifications</h2><dl className="divide-y divide-gray-200 dark:divide-gray-700">{Object.entries(product.specs || {}).map(([key, value]) => <div key={key} className="flex justify-between gap-4 py-3 text-sm"><dt className="font-medium">{key}</dt><dd className="text-right text-gray-500">{String(value)}</dd></div>)}</dl><p className="mt-5 text-sm text-gray-500">Warranty: {product.warranty || "Contact us for warranty details"}</p></div>
				<div className="glass-card p-6"><h2 className="mb-4 text-xl font-semibold">Customer reviews</h2>{product.reviews.length === 0 ? <p className="text-gray-500">No reviews yet.</p> : <div className="space-y-5">{product.reviews.map((review) => <article key={review.id} className="border-b border-gray-200 pb-5 last:border-0 dark:border-gray-700"><div className="flex items-center justify-between"><span className="font-medium">{review.user?.name || "Customer"}</span><span className="flex items-center gap-1 text-sm"><Star size={14} className="fill-yellow-500 text-yellow-500" />{review.rating}</span></div><h3 className="mt-2 font-semibold">{review.title}</h3><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>{review.verified && <span className="mt-2 inline-block text-xs text-green-600">Verified purchase</span>}</article>)}</div>}</div>
			</section>
		</div>
	)
}
