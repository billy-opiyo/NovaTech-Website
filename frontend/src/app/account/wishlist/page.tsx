"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import {
	Heart,
	ShoppingCart,
	Trash2,
	Star,
	ArrowLeft,
	Share2,
} from "lucide-react"

interface WishlistProduct {
	id: string
	productId: string
	name: string
	brand: string
	slug: string
	price: number
	discountedPrice?: number
	image: string
	rating: number
	stock: number
	addedAt: string
}

const mockWishlist: WishlistProduct[] = [
	{
		id: "wish-1",
		productId: "prod-1",
		name: "iPhone 15 Pro Max",
		brand: "Apple",
		slug: "iphone-15-pro-max",
		price: 159999,
		discountedPrice: 149999,
		image:
			"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80",
		rating: 4.8,
		stock: 25,
		addedAt: "2024-08-20",
	},
	{
		id: "wish-2",
		productId: "prod-2",
		name: "MacBook Air M3",
		brand: "Apple",
		slug: "macbook-air-m3",
		price: 189999,
		discountedPrice: 174999,
		image:
			"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80",
		rating: 4.9,
		stock: 15,
		addedAt: "2024-08-18",
	},
	{
		id: "wish-3",
		productId: "prod-3",
		name: "Sony WH-1000XM5",
		brand: "Sony",
		slug: "sony-wh-1000xm5",
		price: 34999,
		image:
			"https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=500&q=80",
		rating: 4.6,
		stock: 40,
		addedAt: "2024-08-15",
	},
	{
		id: "wish-4",
		productId: "prod-4",
		name: "Samsung Galaxy S24 Ultra",
		brand: "Samsung",
		slug: "samsung-galaxy-s24-ultra",
		price: 134999,
		image:
			"https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=500&q=80",
		rating: 4.7,
		stock: 30,
		addedAt: "2024-08-10",
	},
	{
		id: "wish-5",
		productId: "prod-5",
		name: "PlayStation 5",
		brand: "Sony",
		slug: "playstation-5",
		price: 74999,
		image:
			"https://images.unsplash.com/photo-1587202372775-f4b746c6bd84?auto=format&fit=crop&w=500&q=80",
		rating: 4.9,
		stock: 10,
		addedAt: "2024-08-05",
	},
]

export default function WishlistPage() {
	const [items, setItems] = useState<WishlistProduct[]>(mockWishlist)
	const [removingId, setRemovingId] = useState<string | null>(null)
	const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc">(
		"recent",
	)

	const sortedItems = [...items].sort((a, b) => {
		switch (sortBy) {
			case "price-asc":
				return (a.discountedPrice || a.price) - (b.discountedPrice || b.price)
			case "price-desc":
				return (b.discountedPrice || b.price) - (a.discountedPrice || a.price)
			default:
				return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
		}
	})

	const handleRemove = (id: string) => {
		setRemovingId(id)
		setTimeout(() => {
			setItems(items.filter((item) => item.id !== id))
			setRemovingId(null)
		}, 300)
	}

	const handleAddToCart = (product: WishlistProduct) => {
		alert(`${product.name} added to cart!`)
	}

	const handleShare = async (product: WishlistProduct) => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: product.name,
					text: `Check out ${product.name} on ElectroBuy!`,
					url: `${window.location.origin}/products/${product.slug}`,
				})
			} catch {
				console.log("Share cancelled")
			}
		} else {
			navigator.clipboard.writeText(
				`${window.location.origin}/products/${product.slug}`,
			)
			alert("Link copied to clipboard!")
		}
	}

	if (items.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="text-center py-20"
			>
				<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
					<Heart size={40} className="text-gray-400" />
				</div>
				<h1 className="text-3xl font-bold mb-4">Your Wishlist is Empty</h1>
				<p className="text-gray-500 mb-8 max-w-md mx-auto">
					Save items you love to your wishlist. Review them anytime and easily
					add them to your cart.
				</p>
				<Link
					href="/products"
					className="btn-primary inline-flex items-center gap-2"
				>
					<ShoppingCart size={18} /> Start Shopping
				</Link>
			</motion.div>
		)
	}

	return (
		<div>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<Link
						href="/account"
						className="flex items-center gap-1 text-gray-500 hover:text-primary transition mb-2"
					>
						<ArrowLeft size={16} /> Back to Account
					</Link>
					<h1 className="text-3xl font-bold">My Wishlist</h1>
					<p className="text-gray-500 mt-1">{items.length} items saved</p>
				</div>
				<div className="flex items-center gap-4">
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
						className="px-4 py-2 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					>
						<option value="recent">Recently Added</option>
						<option value="price-asc">Price: Low to High</option>
						<option value="price-desc">Price: High to Low</option>
					</select>
					<button
						onClick={() => setItems([])}
						className="text-sm text-red-500 hover:text-red-600 transition flex items-center gap-1"
					>
						<Trash2 size={16} /> Clear All
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<AnimatePresence>
					{sortedItems.map((item, i) => (
						<motion.div
							key={item.id}
							initial={{ opacity: 0, y: 20 }}
							animate={
								removingId === item.id
									? { opacity: 0, scale: 0.8 }
									: { opacity: 1, y: 0 }
							}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ delay: i * 0.05 }}
							className="glass-card group"
						>
							<div className="relative h-56 w-full rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
								<Link href={`/products/${item.slug}`}>
									<Image
										src={item.image}
										alt={item.name}
										fill
										className="object-cover group-hover:scale-105 transition-transform duration-500"
									/>
								</Link>
								{item.discountedPrice && (
									<span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
										{Math.round(
											((item.price - item.discountedPrice) / item.price) * 100,
										)}
										% OFF
									</span>
								)}
								<button
									onClick={() => handleRemove(item.id)}
									className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-black/50 hover:bg-red-50 dark:hover:bg-red-900/30 transition group/btn"
								>
									<Heart size={18} className="text-red-500 fill-red-500" />
								</button>
							</div>

							<div className="p-1">
								<p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
									{item.brand}
								</p>
								<Link
									href={`/products/${item.slug}`}
									className="font-semibold hover:text-primary transition line-clamp-1"
								>
									{item.name}
								</Link>

								<div className="flex items-center gap-1 mt-2 mb-3">
									<div className="flex">
										{Array.from({ length: 5 }).map((_, starIndex) => (
											<Star
												key={starIndex}
												size={14}
												className={
													starIndex < Math.floor(item.rating)
														? "text-yellow-500 fill-yellow-500"
														: "text-gray-300"
												}
											/>
										))}
									</div>
									<span className="text-sm text-gray-500">{item.rating}</span>
								</div>

								<div className="flex items-baseline gap-2 mb-3">
									{item.discountedPrice ? (
										<>
											<span className="text-xl font-bold text-primary">
												KES {item.discountedPrice.toLocaleString()}
											</span>
											<span className="text-sm line-through text-gray-400">
												KES {item.price.toLocaleString()}
											</span>
										</>
									) : (
										<span className="text-xl font-bold">
											KES {item.price.toLocaleString()}
										</span>
									)}
								</div>

								<div className="text-sm text-gray-500 mb-4">
									{item.stock > 10 ? (
										<span className="text-green-500">In Stock</span>
									) : item.stock > 0 ? (
										<span className="text-orange-500">
											Only {item.stock} left
										</span>
									) : (
										<span className="text-red-500">Out of Stock</span>
									)}
								</div>

								<div className="flex gap-2">
									<button
										onClick={() => handleAddToCart(item)}
										disabled={item.stock === 0}
										className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50"
									>
										<ShoppingCart size={16} /> Add to Cart
									</button>
									<button
										onClick={() => handleShare(item)}
										className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
										title="Share"
									>
										<Share2 size={16} />
									</button>
								</div>
							</div>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</div>
	)
}
