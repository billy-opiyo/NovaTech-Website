"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Heart, LoaderCircle, ShoppingCart } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { useSession } from "next-auth/react"
import { getProductImage } from "@/constants/productImages"
import { useCart } from "@/lib/cartContext"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"
import { useToast } from "@/components/ui/Toast"

type ProductActionsProps = {
	productId: string
	name: string
	brand: string
	image?: string
	price: number
	stock: number
	slug: string
	hasVariants?: boolean
	merchantHref: string
}

export default function ProductActions({ productId, name, brand, image, price, stock, slug, hasVariants, merchantHref }: ProductActionsProps) {
	const store = useStoreContext()
	const { data: session } = useSession()
	const { addItem } = useCart()
	const { addToast } = useToast()
	const router = useRouter()
	const pathname = usePathname()
	const [wishlisted, setWishlisted] = useState(false)
	const [wishlistBusy, setWishlistBusy] = useState(false)

	function addToCart() {
		if (stock < 1) {
			addToast("This product is currently out of stock.", "error")
			return
		}
		addItem({ productId, name, brand, image: getProductImage(image, name), price, quantity: 1, maxStock: stock, slug })
		addToast(`${name} added to cart.`, "success")
	}

	async function toggleWishlist() {
		if (!session?.user) {
			const callbackUrl = pathname || getStoreRouteHref(store, `/products/${slug}`)
			router.push(getStoreRouteHref(store, `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`))
			return
		}

		setWishlistBusy(true)
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/wishlist"), {
				method: wishlisted ? "DELETE" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ productId }),
			})
			const data = await response.json().catch(() => ({}))
			if (!response.ok) {
				if (!wishlisted && response.status === 400 && data.message === "Already in wishlist") {
					setWishlisted(true)
					addToast("This product is already in your wishlist.", "info")
					return
				}
				throw new Error(data.message || "Unable to update wishlist")
			}
			setWishlisted((current) => !current)
			addToast(wishlisted ? "Removed from wishlist." : "Added to wishlist.", "success")
		} catch (reason) {
			addToast(reason instanceof Error ? reason.message : "Unable to update wishlist", "error")
		} finally {
			setWishlistBusy(false)
		}
	}

	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-1.5">
			{hasVariants ? <Link href={getStoreRouteHref(store, `/products/${slug}`)} className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg bg-primary px-2 py-2 text-xs font-semibold text-white transition hover:brightness-110" title="Choose product options">
				<ShoppingCart size={15} aria-hidden="true" /><span className="truncate">Choose options</span>
			</Link> : <button type="button" onClick={addToCart} disabled={stock < 1} className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg bg-primary px-2 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50" title={stock < 1 ? "Out of stock" : "Add to cart"}>
				<ShoppingCart size={15} aria-hidden="true" /><span className="truncate">Add to cart</span>
			</button>}
			<button type="button" onClick={() => void toggleWishlist()} disabled={wishlistBusy} aria-label={wishlisted ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`} title={wishlisted ? "Remove from wishlist" : "Add to wishlist"} className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-2 py-2 text-primary transition hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60 dark:border-gray-600">
				{wishlistBusy ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Heart size={15} className={wishlisted ? "fill-current" : ""} aria-hidden="true" />}
			</button>
			<a href={merchantHref} target="_blank" rel="noreferrer" aria-label={`Order ${name} on WhatsApp`} title="Order on WhatsApp" className="inline-flex items-center justify-center rounded-lg bg-[#1e8e3e] px-2 py-2 text-xs font-semibold text-white transition hover:bg-[#25D366]">
				<FaWhatsapp size={15} aria-hidden="true" />
			</a>
		</div>
	)
}
