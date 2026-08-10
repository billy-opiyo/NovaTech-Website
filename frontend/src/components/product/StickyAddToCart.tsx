"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingCart, Heart, Minus, Plus } from "lucide-react"
import clsx from "clsx"

interface StickyAddToCartProps {
	productName: string
	price: number
	discountedPrice?: number
	stock: number
	onAddToCart: (quantity: number) => void
	onToggleWishlist: () => void
	isInWishlist: boolean
}

export default function StickyAddToCart({
	productName,
	price,
	discountedPrice,
	stock,
	onAddToCart,
	onToggleWishlist,
	isInWishlist,
}: StickyAddToCartProps) {
	const [isVisible, setIsVisible] = useState(false)
	const [quantity, setQuantity] = useState(1)

	useEffect(() => {
		const handleScroll = () => {
			setIsVisible(window.scrollY > 400)
		}

		window.addEventListener("scroll", handleScroll)
		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 100, opacity: 0 }}
					className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-inset-bottom"
				>
					<div className="glass backdrop-blur-lg border-t border-white/10 px-4 py-3">
						<div className="flex items-center gap-3">
							<div className="hidden sm:flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
								<button
									onClick={() => setQuantity(Math.max(1, quantity - 1))}
									className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
								>
									<Minus size={14} />
								</button>
								<span className="px-3 text-sm font-medium">{quantity}</span>
								<button
									onClick={() => setQuantity(Math.min(stock, quantity + 1))}
									className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
								>
									<Plus size={14} />
								</button>
							</div>

							<button
								onClick={() => onAddToCart(quantity)}
								disabled={stock === 0}
								className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
							>
								<ShoppingCart size={18} />
								<span>
									{stock === 0
										? "Out of Stock"
										: `Add to Cart - KES ${((discountedPrice || price) * quantity).toLocaleString()}`}
								</span>
							</button>

							<button
								onClick={onToggleWishlist}
								className={clsx(
									"p-3 rounded-lg border transition",
									isInWishlist
										? "border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20"
										: "border-gray-300 dark:border-gray-600",
								)}
							>
								<Heart
									size={18}
									className={isInWishlist ? "fill-current" : ""}
								/>
							</button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
