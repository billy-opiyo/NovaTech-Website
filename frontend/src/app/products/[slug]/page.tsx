"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { AlertCircle, ChevronLeft, ChevronRight, Heart, LoaderCircle, Minus, Plus, ShoppingCart, Star } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { useSession } from "next-auth/react"
import { fallbackToProductPlaceholder, getProductImage } from "@/constants/productImages"
import NotFoundState from "@/components/content/NotFoundState"
import Recommendations from "@/components/product/Recommendations"
import ProductReviewForm from "@/components/product/ProductReviewForm"
import { useCart } from "@/lib/cartContext"
import { useStoreContext } from "@/lib/store-context"
import { getMerchantWhatsAppHref } from "@/lib/merchant-contact"
import { getStoreRouteHref } from "@/lib/store-home"
import { useToast } from "@/components/ui/Toast"
import type { CakeCustomizations } from "backend/lib/cake-customizations"
import { getProductSupportDescription } from "@/lib/industry-copy"

type Variant = { name: string; value: string; priceModifier?: number | null; stock: number }
type Review = {
	id: string
	user?: { name?: string | null; image?: string | null }
	rating: number
	title?: string | null
	comment?: string | null
	createdAt: string
	isVerifiedPurchase: boolean
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
	attributeValues?: { id: string; value: unknown; displayValue?: string | null; definition: { id: string; industryId: string; name: string; key: string } }[]
	variants: Variant[]
	reviews: Review[]
}

export default function ProductDetailPage() {
	const { slug } = useParams<{ slug: string }>()
	const store = useStoreContext()
	const productEndpoint = getStoreRouteHref(store, `/api/products/${encodeURIComponent(slug)}`)
	const wishlistEndpoint = getStoreRouteHref(store, "/api/wishlist")
	const { data: session } = useSession()
	const { addItem } = useCart()
	const { addToast } = useToast()
	const router = useRouter()
	const pathname = usePathname()
	const [product, setProduct] = useState<Product | null>(null)
	const [error, setError] = useState("")
	const [selectedImage, setSelectedImage] = useState(0)
	const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
	const [quantity, setQuantity] = useState(1)
	const [cakeMessage, setCakeMessage] = useState("")
	const [cakeIcing, setCakeIcing] = useState<CakeCustomizations["icing"]>(undefined)
	const [cakeEventDate, setCakeEventDate] = useState("")
	const [cakeDietaryNotes, setCakeDietaryNotes] = useState("")
	const [isInWishlist, setIsInWishlist] = useState(false)
	const [wishlistBusy, setWishlistBusy] = useState(false)

	useEffect(() => {
		if (!slug) return
		const controller = new AbortController()
		setError("")
		setProduct(null)
		setSelectedVariants({})
		setQuantity(1)
		fetch(productEndpoint, { cache: "no-store", signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error("Product not found")
				return response.json()
			})
			.then((data) => setProduct(data))
			.catch((reason) => { if (reason.name !== "AbortError") setError(reason.message || "Unable to load product") })
		return () => controller.abort()
	}, [productEndpoint, slug])

	useEffect(() => {
		if (!session?.user?.id || !product?.id) return
		let cancelled = false
		fetch(wishlistEndpoint, { cache: "no-store" })
			.then((response) => response.ok ? response.json() : [])
			.then((items: { productId: string }[]) => {
				if (!cancelled) setIsInWishlist(items.some((item) => item.productId === product.id))
			})
			.catch(() => undefined)
		return () => { cancelled = true }
	}, [product?.id, session?.user?.id, wishlistEndpoint])

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
	const hasCompleteVariantSelection = Object.keys(groupedVariants).every((name) => Boolean(selectedVariants[name]))
	const hasAvailableVariant = product.variants.some((variant) => variant.stock > 0)
	const selectedStock = product.variants
		.filter((variant) => selectedVariants[variant.name] === variant.value)
		.reduce((stock, variant) => Math.min(stock, variant.stock), product.variants.length > 0 && !hasCompleteVariantSelection ? 0 : product.stock)
	const displayedStock = product.variants.length > 0 && !hasCompleteVariantSelection
		? Math.max(0, ...product.variants.map((variant) => variant.stock))
		: selectedStock
	const addToCartDisabled = product.variants.length > 0 ? !hasAvailableVariant || (hasCompleteVariantSelection && selectedStock < 1) : selectedStock < 1
	const electronicsStore = store.industry?.slug === "electronics"
	const productDetailsTitle = electronicsStore ? "Specifications" : store.industry?.slug === "cakes" ? "Order Details" : store.industry?.slug === "furniture" ? "Furniture Details" : store.industry?.slug === "boutiques" ? "Style & Fit Details" : "Product Details"
	const detailSpecifications = electronicsStore ? Object.entries(product.specs || {}) : []
	const industryAttributes = (product.attributeValues || []).filter((attribute) => attribute.definition.industryId === store.industry?.id)

	const cakePreferenceText = [cakeMessage.trim() ? `Message: ${cakeMessage.trim()}` : "", cakeIcing ? `Icing: ${cakeIcing}` : "", cakeEventDate ? `Event date: ${cakeEventDate}` : "", cakeDietaryNotes.trim() ? `Notes: ${cakeDietaryNotes.trim()}` : ""].filter(Boolean).join(", ")
	const selectedOptionsText = Object.entries(selectedVariants).map(([name, value]) => `${name}: ${value}`).join(" / ")
	const merchantOrderHref = getMerchantWhatsAppHref({ number: store.contact.whatsappNumber, storeName: store.brand.name, industrySlug: store.industry?.slug, items: [{ name: loadedProduct.name, quantity, variant: [selectedOptionsText, store.industry?.slug === "cakes" ? cakePreferenceText : ""].filter(Boolean).join(" · ") || undefined, price: currentPrice }] })

	function addToCart() {
		if (loadedProduct.variants.length > 0 && !hasCompleteVariantSelection) {
			document.getElementById("product-variant-options")?.scrollIntoView({ behavior: "smooth", block: "center" })
			addToast("Choose the available product options to continue.", "info")
			return
		}
		if (selectedStock < 1) {
			addToast("This product is currently out of stock.", "error")
			return
		}
		const customizations: CakeCustomizations = {
			...(cakeMessage.trim() ? { message: cakeMessage.trim() } : {}),
			...(cakeIcing ? { icing: cakeIcing } : {}),
			...(cakeEventDate ? { eventDate: cakeEventDate } : {}),
			...(cakeDietaryNotes.trim() ? { dietaryNotes: cakeDietaryNotes.trim() } : {}),
		}
		addItem({ productId: loadedProduct.id, name: loadedProduct.name, brand: loadedProduct.brand, image: getProductImage(loadedProduct.images[0], loadedProduct.name, store.industry?.slug), price: currentPrice, quantity, maxStock: selectedStock, slug: loadedProduct.slug, variant: Object.entries(selectedVariants).map(([name, value]) => `${name}: ${value}`).join(" / ") || undefined, ...(store.industry?.slug === "cakes" && Object.keys(customizations).length > 0 ? { customizations } : {}) })
		addToast(`${loadedProduct.name} added to cart.`, "success")
	}

	async function toggleWishlist() {
		if (!session?.user) {
			router.push(getStoreRouteHref(store, `/auth/signin?callbackUrl=${encodeURIComponent(pathname || getStoreRouteHref(store, `/products/${loadedProduct.slug}`))}`))
			return
		}
		setWishlistBusy(true)
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/wishlist"), { method: isInWishlist ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: loadedProduct.id }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to update wishlist")
			setIsInWishlist((current) => !current)
			addToast(isInWishlist ? "Removed from wishlist." : "Added to wishlist.", "success")
		} catch (reason) {
			addToast(reason instanceof Error ? reason.message : "Unable to update wishlist", "error")
		} finally {
			setWishlistBusy(false)
		}
	}

	return (
		<div className="mx-auto max-w-7xl space-y-10 py-6">
			<nav className="flex items-center gap-2 text-sm text-gray-500">
				<Link href={getStoreRouteHref(store, "/products")}>Products</Link><ChevronRight size={14} />
				<Link href={getStoreRouteHref(store, `/category/${product.category.slug}`)}>{product.category.name}</Link><ChevronRight size={14} />
				<span className="text-gray-900 dark:text-white">{product.name}</span>
			</nav>

			<section className="grid gap-8 lg:grid-cols-2">
				<div>
					<div className="product-detail-media relative flex min-h-[18rem] items-center justify-center sm:min-h-[26rem] lg:min-h-[34rem]">
						{/* Keep the source aspect ratio: no forced square crop or letterbox frame. */}
						<img src={getProductImage(product.images[selectedImage], product.name, store.industry?.slug)} alt={product.name} onError={fallbackToProductPlaceholder} className="block h-auto w-auto max-h-[min(70vh,42rem)] max-w-full rounded-md object-contain" fetchPriority="high" decoding="async" />
						{product.images.length > 1 && <>
							<button aria-label="Previous image" onClick={() => setSelectedImage((selectedImage + product.images.length - 1) % product.images.length)} className="absolute left-3 top-1/2 rounded-full bg-black/40 p-2 text-white"><ChevronLeft /></button>
							<button aria-label="Next image" onClick={() => setSelectedImage((selectedImage + 1) % product.images.length)} className="absolute right-3 top-1/2 rounded-full bg-black/40 p-2 text-white"><ChevronRight /></button>
						</>}
					</div>
					<div className="mt-3 flex gap-3 overflow-auto">
						{product.images.map((image, index) => <button key={image} type="button" onClick={() => setSelectedImage(index)} aria-label={`View ${product.name} image ${index + 1}`} aria-current={selectedImage === index ? "true" : undefined} className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-visible rounded-lg bg-transparent p-0 transition-opacity ${selectedImage === index ? "opacity-100" : "opacity-60 hover:opacity-100"}`}><img src={getProductImage(image, product.name, store.industry?.slug)} alt={`${product.name} ${index + 1}`} onError={fallbackToProductPlaceholder} className="block h-auto w-auto max-h-full max-w-full rounded-md object-contain" loading="lazy" decoding="async" /></button>)}
					</div>
				</div>

				<div className="space-y-5">
					<p className="text-sm font-medium uppercase tracking-wider text-primary">{product.brand}</p>
					<h1 className="text-3xl font-bold sm:text-4xl">{product.name}</h1>
					<p className="text-sm text-gray-500">SKU: {product.sku}</p>
					<div className="flex items-center gap-2"><Star size={18} className="fill-yellow-500 text-yellow-500" /><span>{product.averageRating.toFixed(1)}</span><span className="text-gray-500">({product.reviewCount} reviews)</span></div>
					<div className="flex items-baseline gap-3"><span className="text-3xl font-bold text-primary">KES {currentPrice.toLocaleString()}</span>{product.discountedPrice && <span className="text-lg text-gray-400 line-through">KES {product.price.toLocaleString()}</span>}</div>
					<p className="flex items-center gap-2 text-sm">{product.variants.length > 0 && !hasCompleteVariantSelection ? hasAvailableVariant ? <><span className="h-2 w-2 rounded-full bg-green-500" />Up to {displayedStock} available across options</> : <><AlertCircle size={16} className="text-red-500" />Out of stock</> : selectedStock > 0 ? <><span className="h-2 w-2 rounded-full bg-green-500" />{selectedStock} available</> : <><AlertCircle size={16} className="text-red-500" />Out of stock</>}</p>

					{Object.entries(groupedVariants).length > 0 && <div id="product-variant-options" className="space-y-3">{Object.entries(groupedVariants).map(([name, variants]) => <div key={name}><h2 className="mb-2 font-semibold">{name}</h2><div className="flex flex-wrap gap-2">{variants.map((variant) => <button key={variant.value} type="button" disabled={variant.stock < 1} aria-pressed={selectedVariants[name] === variant.value} onClick={() => { setSelectedVariants({ ...selectedVariants, [name]: variant.value }); setQuantity((current) => Math.min(current, variant.stock)) }} className={`rounded-lg border px-3 py-2 text-sm transition ${selectedVariants[name] === variant.value ? "border-primary bg-primary text-white" : "border-gray-300 hover:border-primary"} disabled:cursor-not-allowed disabled:opacity-40`}>{variant.value}</button>)}</div></div>)}</div>}

					{store.industry?.slug === "cakes" && <fieldset className="glass-card space-y-3 p-4"><legend className="px-2 font-semibold text-primary">Make it yours</legend><p className="text-sm text-gray-500">Optional preferences are sent with this cake line for the baker to confirm.</p><label className="block text-sm">Message on the cake<input maxLength={50} value={cakeMessage} onChange={(event) => setCakeMessage(event.target.value)} placeholder="e.g. Happy birthday, Amina!" className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label><label className="block text-sm">Icing preference<select value={cakeIcing || ""} onChange={(event) => setCakeIcing((event.target.value || undefined) as CakeCustomizations["icing"])} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface"><option value="">Let the baker recommend</option><option value="chocolate-buttercream">Chocolate buttercream</option><option value="vanilla-buttercream">Vanilla buttercream</option><option value="whipped-cream">Whipped cream</option><option value="fondant">Fondant finish</option><option value="no-preference">No preference</option></select></label><label className="block text-sm">Celebration date<input type="date" value={cakeEventDate} onChange={(event) => setCakeEventDate(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label><label className="block text-sm">Dietary needs or design notes<textarea maxLength={300} value={cakeDietaryNotes} onChange={(event) => setCakeDietaryNotes(event.target.value)} rows={3} placeholder="Allergies, colours, or a detail to discuss with the baker" className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label></fieldset>}

					<div className="flex flex-wrap items-center gap-3"><div className="flex items-center rounded-lg border"><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="p-3 disabled:cursor-not-allowed disabled:opacity-40"><Minus size={16} /></button><span className="w-10 text-center">{quantity}</span><button type="button" aria-label="Increase quantity" disabled={!hasCompleteVariantSelection || quantity >= selectedStock} onClick={() => setQuantity((current) => Math.min(selectedStock, current + 1))} className="p-3 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16} /></button></div><button type="button" onClick={addToCart} disabled={addToCartDisabled} className="btn-primary inline-flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"><ShoppingCart size={18} />{product.variants.length > 0 && !hasCompleteVariantSelection ? "Select options" : selectedStock < 1 ? "Out of stock" : "Add to cart"}</button><button type="button" onClick={() => void toggleWishlist()} disabled={wishlistBusy} aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"} title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"} className="inline-flex items-center justify-center rounded-lg border p-3 text-primary transition hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60"><LoaderCircle size={18} className={wishlistBusy ? "animate-spin" : "hidden"} aria-hidden="true" /><Heart size={18} className={`${wishlistBusy ? "hidden" : ""} ${isInWishlist ? "fill-current" : ""}`} aria-hidden="true" /></button><a href={merchantOrderHref || "#"} target={merchantOrderHref ? "_blank" : undefined} rel={merchantOrderHref ? "noreferrer" : undefined} aria-disabled={!merchantOrderHref} title={merchantOrderHref ? "Order or ask about this product on WhatsApp" : "This store has not configured a WhatsApp number"} onClick={(event) => { if (!merchantOrderHref) { event.preventDefault(); addToast("This store has not configured a WhatsApp number yet.", "info") } }} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e8e3e] px-4 py-3 text-center font-semibold text-white transition hover:bg-[#25D366] sm:w-auto ${merchantOrderHref ? "" : "opacity-60"}`}><FaWhatsapp size={18} aria-hidden="true" />Order via WhatsApp</a></div>
					<p className="text-xs text-gray-500">{getProductSupportDescription(store.industry?.slug)}</p>
					<p className="text-gray-600 dark:text-gray-300">{product.description}</p>
				</div>
			</section>

			<section className="grid gap-8 lg:grid-cols-2">
				<div className="glass-card p-6"><h2 className="mb-4 text-xl font-semibold">{productDetailsTitle}</h2><dl className="divide-y divide-gray-200 dark:divide-gray-700">{detailSpecifications.map(([key, value]) => <div key={key} className="flex justify-between gap-4 py-3 text-sm"><dt className="font-medium">{key}</dt><dd className="text-right text-gray-500">{String(value)}</dd></div>)}{industryAttributes.map((attribute) => <div key={attribute.id} className="flex justify-between gap-4 py-3 text-sm"><dt className="font-medium">{attribute.definition.name}</dt><dd className="text-right text-gray-500">{attribute.displayValue || String(attribute.value)}</dd></div>)}</dl><p className="mt-5 text-sm text-gray-500">{electronicsStore ? `Warranty: ${product.warranty || "Contact us for warranty details"}` : store.industry?.slug === "cakes" ? "Share custom details with the store so the baker can confirm them before preparation." : store.industry?.slug === "furniture" ? "Contact the store to confirm materials, care, delivery, and any applicable after-sales support." : store.industry?.slug === "boutiques" ? "Check the available size, colour, and material details, and contact the store if you need help choosing." : "Contact the store for product and after-sales details."}</p></div>
				<div className="glass-card p-6"><h2 className="mb-4 text-xl font-semibold">Customer reviews</h2>{product.reviews.length === 0 ? <p className="text-gray-500">No reviews yet.</p> : <div className="space-y-5">{product.reviews.map((review) => <article key={review.id} className="border-b border-gray-200 pb-5 last:border-0 dark:border-gray-700"><div className="flex items-center justify-between"><span className="font-medium">{review.user?.name || "Customer"}</span><span className="flex items-center gap-1 text-sm"><Star size={14} className="fill-yellow-500 text-yellow-500" />{review.rating}</span></div><h3 className="mt-2 font-semibold">{review.title}</h3><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>{review.isVerifiedPurchase && <span className="mt-2 inline-block text-xs text-green-600">Verified purchase</span>}</article>)}</div>}<ProductReviewForm productId={product.id} /></div>
			</section>

			<Recommendations productId={product.id} />
		</div>
	)
}
