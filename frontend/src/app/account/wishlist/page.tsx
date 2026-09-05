"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Trash2 } from "lucide-react"
import { getProductImage } from "@/constants/productImages"
import { useCart } from "@/lib/cartContext"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

type WishlistItem = {
	id: string
	productId: string
	createdAt: string
	product: { id: string; name: string; slug: string; price: number; discountedPrice?: number | null; images: string[]; brand: string; stock: number; variants: { stock: number }[] }
}

export default function WishlistPage() {
	const store = useStoreContext()
	const { addToast } = useToast()
	const [items, setItems] = useState<WishlistItem[]>([])
	const [sortBy, setSortBy] = useState("recent")
	const [error, setError] = useState("")
	const [itemToRemove, setItemToRemove] = useState<WishlistItem | null>(null)
	const [clearRequested, setClearRequested] = useState(false)
	const { addItem } = useCart()

	async function load() {
		const response = await fetch("/api/wishlist")
		if (!response.ok) throw new Error("Unable to load wishlist")
		setItems(await response.json())
	}
	useEffect(() => { load().catch((reason) => setError(reason.message)) }, [])

	const sorted = useMemo(() => [...items].sort((a, b) => sortBy === "price-asc" ? (a.product.discountedPrice ?? a.product.price) - (b.product.discountedPrice ?? b.product.price) : sortBy === "price-desc" ? (b.product.discountedPrice ?? b.product.price) - (a.product.discountedPrice ?? a.product.price) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [items, sortBy])
	async function remove() { if (!itemToRemove) return; try { const response = await fetch("/api/wishlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: itemToRemove.productId }) }); if (!response.ok) throw new Error("Unable to remove wishlist item"); setItems((current) => current.filter((item) => item.productId !== itemToRemove.productId)); setItemToRemove(null); addToast("Removed from wishlist", "success") } catch (error) { addToast(error instanceof Error ? error.message : "Unable to remove wishlist item", "error") } }
	async function clear() { if (!clearRequested) return; try { const response = await fetch("/api/wishlist", { method: "DELETE" }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || "Unable to clear wishlist"); setItems([]); setClearRequested(false); addToast("Wishlist cleared successfully", "success") } catch (error) { addToast(error instanceof Error ? error.message : "Unable to clear wishlist", "error") } }
	function availableStock(product: WishlistItem["product"]) { return product.variants.length ? Math.max(...product.variants.map((variant) => variant.stock)) : product.stock }
	function addToCart(item: WishlistItem) { const product = item.product; addItem({ productId: product.id, name: product.name, brand: product.brand, image: product.images[0] || "/placeholder-product.jpg", price: product.discountedPrice ?? product.price, quantity: 1, maxStock: availableStock(product), slug: product.slug }); addToast("Added to cart", "success") }
	async function shareProduct(product: WishlistItem["product"]) {
		const url = `${window.location.origin}/products/${product.slug}`
		if (navigator.share) {
			await navigator.share({ title: product.name, url }).catch(() => undefined)
			return
		}
		if (navigator.clipboard) {
			await navigator.clipboard.writeText(url)
		}
	}

	if (error) return <div className="py-20 text-center text-red-500">{error}</div>
	if (!items.length) return <div className="py-20 text-center"><Heart className="mx-auto mb-5 text-gray-400" size={48}/><h1 className="text-3xl font-bold">Your Wishlist is Empty</h1><p className="mx-auto mb-7 mt-3 max-w-md text-gray-500">Save items you love and review them anytime.</p><Link href={getStoreRouteHref(store, "/products")} className="btn-primary inline-flex items-center gap-2"><ShoppingCart size={18}/> Start Shopping</Link></div>

	return <div className="space-y-8"><ConfirmDialog open={Boolean(itemToRemove)} title="Remove wishlist item?" description={itemToRemove ? `${itemToRemove.product.name} will be removed from your wishlist.` : ""} confirmLabel="Remove item" onCancel={() => setItemToRemove(null)} onConfirm={() => { void remove() }} /><ConfirmDialog open={clearRequested} title="Clear wishlist?" description="Every saved item will be removed from your wishlist." confirmLabel="Clear wishlist" onCancel={() => setClearRequested(false)} onConfirm={() => { void clear() }} /><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><Link href={getStoreRouteHref(store, "/account")} className="mb-2 inline-flex items-center gap-1 text-gray-500"><ArrowLeft size={16}/> Back to account</Link><h1 className="text-3xl font-bold">My Wishlist</h1><p className="mt-1 text-gray-500">{items.length} items saved</p></div><div className="flex flex-wrap gap-3"><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border px-3 py-2"><option value="recent">Recently Added</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option></select><button onClick={() => setClearRequested(true)} className="destructive-action inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Trash2 size={16}/> Clear All</button></div></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{sorted.map((item) => { const product = item.product; const stock = availableStock(product); const hasVariants = product.variants.length > 0; const productHref = getStoreRouteHref(store, `/products/${product.slug}`); return <article key={item.id} className="glass-card p-4"><div className="relative h-52 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"><Link href={productHref}><Image src={getProductImage(product.images[0], product.name)} alt={product.name} fill className="object-cover"/></Link><button onClick={() => setItemToRemove(item)} aria-label={`Remove ${product.name}`} className="absolute right-3 top-3 rounded-full bg-white/80 p-2 text-red-500"><Heart size={18} className="fill-red-500"/></button></div><p className="mt-4 text-xs uppercase tracking-wider text-gray-500">{product.brand}</p><Link href={productHref} className="font-semibold hover:text-primary">{product.name}</Link><div className="mt-2 flex items-center gap-1 text-sm text-gray-500"><Star size={14} className="fill-yellow-500 text-yellow-500"/> Product rating</div><div className="mt-3 flex items-baseline gap-2">{product.discountedPrice ? <><b className="text-xl text-primary">KES {product.discountedPrice.toLocaleString()}</b><span className="text-sm text-gray-400 line-through">KES {product.price.toLocaleString()}</span></> : <b className="text-xl">KES {product.price.toLocaleString()}</b>}</div><p className={`my-3 text-sm ${stock ? "text-green-600" : "text-red-500"}`}>{stock ? `${stock} in stock` : "Out of stock"}</p><div className="flex gap-2">{hasVariants ? <Link href={productHref} className="btn-primary flex-1 text-center"><ShoppingCart size={16} className="mr-1 inline"/> Choose options</Link> : <button onClick={() => addToCart(item)} disabled={!stock} className="btn-primary flex-1 disabled:opacity-50"><ShoppingCart size={16} className="mr-1 inline"/> Add to cart</button>}<button type="button" onClick={() => shareProduct(product)} aria-label={`Share ${product.name}`} className="rounded-lg border px-3"><Share2 size={16}/></button></div></article> })}</div></div>
}
