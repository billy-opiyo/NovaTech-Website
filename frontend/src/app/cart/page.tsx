"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/lib/cartContext"
import { useStoreContext } from "@/lib/store-context"
import {
	Minus,
	Plus,
	Trash2,
	Heart,
	ShoppingBag,
	ArrowLeft,
	Truck,
	Shield,
	AlertCircle,
	Tag,
	ChevronRight,
} from "lucide-react"
import clsx from "clsx"

export default function CartPage() {
	const {
		items,
		removeItem,
		updateQuantity,
		subtotal,
		shippingEstimate,
		total,
		itemCount,
		clearCart,
		saveForLater,
		savedItems,
		moveToCart,
	} = useCart()
	const store = useStoreContext()
	const [couponCode, setCouponCode] = useState("")
	const [couponApplied, setCouponApplied] = useState(false)
	const [couponDiscount, setCouponDiscount] = useState(0)
	const [couponError, setCouponError] = useState("")

	const handleApplyCoupon = async () => {
		if (!couponCode.trim() || couponApplied) return
		setCouponError("")
		try {
			const response = await fetch("/api/coupons/validate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code: couponCode, subtotal }),
			})
			const result = await response.json()
			if (!response.ok || !result.valid) throw new Error(result.message || "Invalid coupon")
			setCouponApplied(true)
			setCouponDiscount(result.discount)
			localStorage.setItem("checkoutCoupon", couponCode.trim().toUpperCase())
		} catch (error: unknown) {
			setCouponError(error instanceof Error ? error.message : "Unable to validate coupon")
		}
	}

	const freeShippingThreshold = Math.max(0, store.ecommerce.freeShippingThreshold)
	const qualifiesForFreeShipping = freeShippingThreshold === 0 || subtotal >= freeShippingThreshold
	const finalTotal = Math.max(0, total - couponDiscount)

	if (items.length === 0 && savedItems.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="text-center py-20"
			>
				<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
					<ShoppingBag size={40} className="text-gray-400" />
				</div>
				<h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
				<p className="text-gray-500 mb-8 max-w-md mx-auto">
					Looks like you haven't added anything to your cart yet. Explore our
					latest deals and find something you love!
				</p>
				<Link
					href="/products"
					className="btn-primary inline-flex items-center gap-2"
				>
					<ShoppingBag size={18} /> Start Shopping
				</Link>
			</motion.div>
		)
	}

	return (
		<div>
			<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 sm:mb-8">
				<Link
					href="/products"
					className="flex items-center gap-1 text-gray-500 hover:text-primary transition text-sm sm:text-base"
				>
					<ArrowLeft size={18} /> Continue Shopping
				</Link>
				<span className="hidden sm:inline text-gray-400">|</span>
				<h1 className="text-xl sm:text-2xl font-bold">
					Shopping Cart ({itemCount} items)
				</h1>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
				{/* Cart Items */}
				<div className="lg:col-span-2 space-y-6">
					{/* Free Shipping Banner */}
					{!qualifiesForFreeShipping && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-accent"
						>
							<Truck className="text-accent flex-shrink-0" size={24} />
							<div className="flex-1">
								<p className="font-medium">
									Add KES {(freeShippingThreshold - subtotal).toLocaleString()} more for free
									shipping!
								</p>
								<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
									<div
										className="bg-accent h-2 rounded-full transition-all duration-500"
										style={{
											width: `${Math.min((subtotal / Math.max(freeShippingThreshold, 1)) * 100, 100)}%`,
										}}
									/>
								</div>
							</div>
						</motion.div>
					)}

					{/* Items */}
					<AnimatePresence>
						{items.map((item) => (
							<motion.div
								key={item.id}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20, height: 0 }}
								className="glass-card p-4 md:p-6"
							>
								<div className="flex flex-col gap-4 sm:flex-row md:gap-6">
									{/* Product Image */}
									<Link
										href={`/products/${item.slug}`}
										className="relative h-24 w-full sm:w-24 md:h-32 md:w-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800"
									>
										<Image
											src={item.image}
											alt={item.name}
											fill
											className="object-cover"
										/>
									</Link>

									{/* Product Details */}
									<div className="flex-1 min-w-0">
										<div className="flex justify-between items-start">
											<div>
												<p className="text-xs text-gray-500 uppercase tracking-wider">
													{item.brand}
												</p>
												<Link
													href={`/products/${item.slug}`}
													className="font-semibold hover:text-primary transition line-clamp-1"
												>
													{item.name}
												</Link>
												{item.variant && (
													<p className="text-sm text-gray-500 mt-1">
														{item.variant}
													</p>
												)}
											</div>
											<p className="font-bold text-lg ml-4">
												KES {(item.price * item.quantity).toLocaleString()}
											</p>
										</div>

										<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
											{/* Quantity Controls */}
											<div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg w-fit">
												<button
													onClick={() =>
														updateQuantity(item.id, item.quantity - 1)
													}
													className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
												>
													<Minus size={16} />
												</button>
												<span className="px-4 py-2 text-sm font-medium min-w-[40px] text-center">
													{item.quantity}
												</span>
												<button
													onClick={() =>
														updateQuantity(item.id, item.quantity + 1)
													}
													disabled={item.quantity >= item.maxStock}
													className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
												>
													<Plus size={16} />
												</button>
											</div>

											{/* Actions */}
											<div className="flex flex-wrap items-center gap-2 sm:gap-3">
												<button
													onClick={() => saveForLater(item.id)}
													className="text-sm text-gray-500 hover:text-primary transition flex items-center gap-1"
												>
													<Heart size={16} /> Save
												</button>
												<button
													onClick={() => removeItem(item.id)}
													className="text-sm text-red-500 hover:text-red-600 transition flex items-center gap-1"
												>
													<Trash2 size={16} /> Remove
												</button>
											</div>
										</div>

										{/* Stock warning */}
										{item.maxStock <= 5 && (
											<p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
												<AlertCircle size={12} /> Only {item.maxStock} left in
												stock
											</p>
										)}
									</div>
								</div>
							</motion.div>
						))}
					</AnimatePresence>

					{/* Saved for Later */}
					{savedItems.length > 0 && (
						<div className="glass-card p-6">
							<h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
								<Heart size={20} className="text-red-500" /> Saved for Later (
								{savedItems.length})
							</h2>
							<div className="space-y-4">
								{savedItems.map((item) => (
									<div
										key={item.id}
										className="flex items-center gap-4 p-3 rounded-lg bg-black/5 dark:bg-white/5"
									>
										<div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
											<Image
												src={item.image}
												alt={item.name}
												fill
												className="object-cover"
											/>
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium truncate">{item.name}</p>
											<p className="text-sm text-gray-500">
												KES {item.price.toLocaleString()}
											</p>
										</div>
										<button
											onClick={() => moveToCart(item.id)}
											className="text-primary hover:underline text-sm font-medium"
										>
											Move to Cart
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Clear Cart */}
					<div className="flex justify-between items-center">
						<button
							onClick={clearCart}
							className="text-sm text-red-500 hover:text-red-600 transition flex items-center gap-1"
						>
							<Trash2 size={16} /> Clear Cart
						</button>
					</div>
				</div>

				{/* Order Summary */}
				<div className="lg:col-span-1">
					<div className="glass-card p-6 sticky top-24 space-y-6">
						<h2 className="font-semibold text-xl">Order Summary</h2>

						{/* Coupon Code */}
						<div>
							<label className="text-sm font-medium mb-2 block flex items-center gap-1">
								<Tag size={14} /> Coupon Code
							</label>
							<div className="flex gap-2">
								<input
									type="text"
									value={couponCode}
									onChange={(e) => setCouponCode(e.target.value)}
									placeholder="Enter code"
									className="flex-1 px-3 py-2 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
									disabled={couponApplied}
								/>
								<button
									onClick={handleApplyCoupon}
									disabled={couponApplied || !couponCode}
									className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50"
								>
									{couponApplied ? "Applied" : "Apply"}
								</button>
							</div>
							{couponApplied && (
									<p className="text-green-500 text-xs mt-1 flex items-center gap-1">
										<AlertCircle size={12} /> Coupon applied successfully.
									</p>
								)}
								{couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
						</div>

						{/* Price Breakdown */}
						<div className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-500">
									Subtotal ({itemCount} items)
								</span>
								<span>KES {subtotal.toLocaleString()}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">Shipping</span>
								<span
									className={shippingEstimate === 0 ? "text-green-500" : ""}
								>
									{shippingEstimate === 0
										? "FREE"
										: `KES ${shippingEstimate.toLocaleString()}`}
								</span>
							</div>
							{couponDiscount > 0 && (
								<div className="flex justify-between text-green-500">
										<span>Discount ({couponCode.toUpperCase()})</span>
									<span>-KES {couponDiscount.toLocaleString()}</span>
								</div>
							)}
							<div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between text-lg font-bold">
								<span>Total</span>
								<span>KES {finalTotal.toLocaleString()}</span>
							</div>
						</div>

						{/* Trust Badges */}
						<div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
							<div className="flex items-center gap-2 text-xs text-gray-500">
								<Shield size={14} className="text-green-500" />
								Secure browsing on Nurava Tech
							</div>
							<div className="flex items-center gap-2 text-xs text-gray-500">
								<Truck size={14} className="text-primary" />
								Delivery across Kenya
							</div>
						</div>

						<div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-gray-600 dark:text-gray-300">
							This selection is sent to the independent store for confirmation. The merchant handles payment, delivery, refunds, and warranty directly.
						</div>

						{/* Merchant handoff */}
						<Link
							href="/checkout"
							className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg"
						>
							Contact Merchant <ChevronRight size={20} />
						</Link>

						{/* Merchant terms */}
						<div className="text-center">
							<p className="text-xs text-gray-500">Payment options and final terms are provided by the store.</p>
						</div>
					</div>
				</div>
			</div>

			{/* Related Products */}
			<section className="mt-16">
				<h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="glass-card animate-pulse">
							<div className="h-40 bg-gray-300 dark:bg-gray-600 rounded-xl mb-4" />
							<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2" />
							<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
						</div>
					))}
				</div>
			</section>
		</div>
	)
}
