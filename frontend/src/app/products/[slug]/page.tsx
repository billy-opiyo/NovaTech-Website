"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import {
	Star,
	Heart,
	Share2,
	ChevronLeft,
	ChevronRight,
	ZoomIn,
	Minus,
	Plus,
	Truck,
	Shield,
	RotateCcw,
	Check,
	ShoppingCart,
	Zap,
	AlertCircle,
} from "lucide-react"
import clsx from "clsx"
import { getProductImage } from "@/constants/productImages"

// Product type
interface ProductDetail {
	id: string
	name: string
	slug: string
	description: string
	brand: string
	sku: string
	price: number
	discountedPrice?: number
	stock: number
	warranty: string
	images: string[]
	category: { name: string; slug: string }
	rating: number
	reviewCount: number
	specs: Record<string, string>
	variants: Variant[]
	features: string[]
}

interface Variant {
	name: string
	values: { value: string; priceModifier?: number; stock: number }[]
}

interface Review {
	id: string
	user: { name: string; image?: string }
	rating: number
	title: string
	comment: string
	createdAt: string
	verified: boolean
}

// Mock product data
const mockProduct: ProductDetail = {
	id: "prod-1",
	name: "MacBook Air M3",
	slug: "macbook-air-m3",
	description: `The new MacBook Air with M3 chip delivers incredible performance in a thin and light design. With up to 18 hours of battery life, a stunning Liquid Retina display, and a silent fanless design, it's the perfect laptop for everyday tasks and beyond.`,
	brand: "Apple",
	sku: "MBA-M3-2024-SLV",
	price: 189999,
	discountedPrice: 174999,
	stock: 15,
	warranty: "12 Months Official Warranty",
	images: [
		"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
		"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
		"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80",
		"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80",
	],
	category: { name: "Laptops", slug: "laptops" },
	rating: 4.8,
	reviewCount: 234,
	specs: {
		Processor: "Apple M3 chip with 8-core CPU",
		GPU: "8-core or 10-core GPU",
		RAM: "8GB Unified Memory (Configurable to 16GB or 24GB)",
		Storage: "256GB SSD (Configurable to 512GB, 1TB, or 2TB)",
		Display: "13.6-inch Liquid Retina display with True Tone",
		Resolution: "2560 x 1664 native resolution",
		Battery: "Up to 18 hours",
		Weight: "1.24 kg",
		Ports: "2x Thunderbolt / USB 4, MagSafe charging, 3.5mm headphone jack",
		Connectivity: "Wi-Fi 6E, Bluetooth 5.3",
		Camera: "1080p FaceTime HD camera",
		Audio: "Four-speaker sound system with Spatial Audio",
	},
	variants: [
		{
			name: "RAM / Storage",
			values: [
				{ value: "8GB / 256GB", stock: 15, priceModifier: 0 },
				{ value: "16GB / 512GB", stock: 8, priceModifier: 30000 },
				{ value: "16GB / 1TB", stock: 5, priceModifier: 60000 },
				{ value: "24GB / 1TB", stock: 3, priceModifier: 90000 },
			],
		},
		{
			name: "Color",
			values: [
				{ value: "Midnight", stock: 10 },
				{ value: "Starlight", stock: 12 },
				{ value: "Space Gray", stock: 8 },
				{ value: "Silver", stock: 7 },
			],
		},
	],
	features: [
		"Apple M3 chip for exceptional performance",
		"13.6-inch Liquid Retina display",
		"Up to 18 hours of battery life",
		"Fanless design for silent operation",
		"1080p FaceTime HD camera",
		"MagSafe charging",
		"Touch ID for secure authentication",
		"Compatible with latest macOS",
	],
}

const mockReviews: Review[] = [
	{
		id: "rev-1",
		user: { name: "John D." },
		rating: 5,
		title: "Best laptop I have ever owned",
		comment:
			"Incredibly fast and lightweight. Battery life is amazing! Perfect for work and travel.",
		createdAt: "2024-08-15",
		verified: true,
	},
	{
		id: "rev-2",
		user: { name: "Sarah K." },
		rating: 4,
		title: "Great laptop, but limited ports",
		comment:
			"Performance is excellent, but I wish it had more ports. Had to buy a dongle.",
		createdAt: "2024-08-10",
		verified: true,
	},
	{
		id: "rev-3",
		user: { name: "Mike O." },
		rating: 5,
		title: "Perfect for developers",
		comment: "Runs all my development tools smoothly. The M3 chip is a beast!",
		createdAt: "2024-08-05",
		verified: true,
	},
]

type Tab =
	| "description"
	| "specifications"
	| "reviews"
	| "warranty"
	| "shipping"

export default function ProductDetailPage() {
	const [product] = useState<ProductDetail>(mockProduct)
	const [selectedImage, setSelectedImage] = useState(0)
	const [selectedVariants, setSelectedVariants] = useState<
		Record<string, string>
	>({})
	const [quantity, setQuantity] = useState(1)
	const [activeTab, setActiveTab] = useState<Tab>("description")
	const [isZoomed, setIsZoomed] = useState(false)
	const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
	const [showAddedToCart, setShowAddedToCart] = useState(false)
	const [isInWishlist, setIsInWishlist] = useState(false)

	// Calculate price with variant modifiers
	const currentPrice = (() => {
		let price = product.discountedPrice || product.price
		product.variants.forEach((variant) => {
			const selected = selectedVariants[variant.name]
			if (selected) {
				const variantValue = variant.values.find((v) => v.value === selected)
				if (variantValue?.priceModifier) {
					price += variantValue.priceModifier
				}
			}
		})
		return price
	})()

	// Handle image zoom
	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isZoomed) return
		const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
		setZoomPosition({
			x: ((e.clientX - left) / width) * 100,
			y: ((e.clientY - top) / height) * 100,
		})
	}

	// Add to cart handler
	const handleAddToCart = () => {
		setShowAddedToCart(true)
		setTimeout(() => setShowAddedToCart(false), 3000)
	}

	const tabs: { key: Tab; label: string }[] = [
		{ key: "description", label: "Description" },
		{ key: "specifications", label: "Specifications" },
		{ key: "reviews", label: `Reviews (${product.reviewCount})` },
		{ key: "warranty", label: "Warranty" },
		{ key: "shipping", label: "Shipping" },
	]

	return (
		<div className="min-h-screen">
			{/* Breadcrumb */}
			<nav className="flex items-center gap-2 text-sm mb-6 text-gray-500">
				<Link href="/" className="hover:text-primary">
					Home
				</Link>
				<ChevronRight size={14} />
				<Link
					href={`/category/${product.category.slug}`}
					className="hover:text-primary"
				>
					{product.category.name}
				</Link>
				<ChevronRight size={14} />
				<span className="text-gray-900 dark:text-white">{product.name}</span>
			</nav>

			{/* Product Main Section */}
			<div className="grid md:grid-cols-2 gap-8 mb-16">
				{/* Image Gallery */}
				<div className="space-y-4">
					<div
						className="relative h-96 md:h-[500px] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-zoom-in"
						onMouseEnter={() => setIsZoomed(true)}
						onMouseLeave={() => setIsZoomed(false)}
						onMouseMove={handleMouseMove}
					>
						<Image
							src={getProductImage(product.images[selectedImage], product.name)}
							alt={product.name}
							fill
							className={clsx(
								"object-cover transition-transform duration-300",
								isZoomed && "scale-150",
							)}
							style={
								isZoomed
									? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }
									: undefined
							}
						/>
						{product.discountedPrice && (
							<span className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
								{Math.round(
									((product.price - product.discountedPrice) / product.price) *
										100,
								)}
								% OFF
							</span>
						)}

						{/* Image navigation arrows */}
						<button
							onClick={() =>
								setSelectedImage((prev) =>
									prev === 0 ? product.images.length - 1 : prev - 1,
								)
							}
							className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/30 transition"
						>
							<ChevronLeft size={20} />
						</button>
						<button
							onClick={() =>
								setSelectedImage((prev) =>
									prev === product.images.length - 1 ? 0 : prev + 1,
								)
							}
							className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/30 transition"
						>
							<ChevronRight size={20} />
						</button>
					</div>

					{/* Thumbnail Strip */}
					<div className="flex gap-3 overflow-x-auto pb-2">
						{product.images.map((img, i) => (
							<button
								key={i}
								onClick={() => setSelectedImage(i)}
								className={clsx(
									"relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition",
									i === selectedImage
										? "border-primary"
										: "border-transparent hover:border-gray-400",
								)}
							>
								<Image
									src={getProductImage(img, product.name)}
									alt={`${product.name} ${i + 1}`}
									fill
									className="object-cover"
								/>
							</button>
						))}
					</div>
				</div>

				{/* Product Info */}
				<div className="space-y-6">
					<div>
						<p className="text-sm text-primary font-medium uppercase tracking-wider">
							{product.brand}
						</p>
						<h1 className="text-3xl md:text-4xl font-bold mt-1">
							{product.name}
						</h1>
						<p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>
					</div>

					{/* Rating */}
					<div className="flex items-center gap-3">
						<div className="flex">
							{Array.from({ length: 5 }).map((_, i) => (
								<Star
									key={i}
									size={18}
									className={
										i < Math.floor(product.rating)
											? "text-yellow-500 fill-yellow-500"
											: "text-gray-300"
									}
								/>
							))}
						</div>
						<span className="font-semibold">{product.rating}</span>
						<Link
							href="#reviews"
							className="text-sm text-primary hover:underline"
						>
							({product.reviewCount} reviews)
						</Link>
					</div>

					{/* Price */}
					<div className="flex items-baseline gap-3">
						<span className="text-4xl font-bold text-primary">
							KES {currentPrice.toLocaleString()}
						</span>
						{product.discountedPrice && (
							<span className="text-xl line-through text-gray-400">
								KES {product.price.toLocaleString()}
							</span>
						)}
					</div>

					{/* Stock Status */}
					<div className="flex items-center gap-2">
						{product.stock > 10 ? (
							<span className="flex items-center gap-1 text-green-600">
								<Check size={16} /> In Stock
							</span>
						) : product.stock > 0 ? (
							<span className="flex items-center gap-1 text-orange-500">
								<AlertCircle size={16} /> Only {product.stock} left
							</span>
						) : (
							<span className="flex items-center gap-1 text-red-500">
								<AlertCircle size={16} /> Out of Stock
							</span>
						)}
					</div>

					{/* Variants */}
					{product.variants.map((variant) => (
						<div key={variant.name}>
							<h4 className="font-medium mb-2">{variant.name}</h4>
							<div className="flex flex-wrap gap-2">
								{variant.values.map((v) => (
									<button
										key={v.value}
										onClick={() =>
											setSelectedVariants({
												...selectedVariants,
												[variant.name]: v.value,
											})
										}
										disabled={v.stock === 0}
										className={clsx(
											"px-4 py-2 rounded-lg border transition text-sm",
											selectedVariants[variant.name] === v.value
												? "border-primary bg-primary/10 text-primary"
												: "border-gray-300 dark:border-gray-600 hover:border-primary",
											v.stock === 0 &&
												"opacity-50 cursor-not-allowed line-through",
										)}
									>
										{v.value}
										{v.priceModifier && v.priceModifier > 0 && (
											<span className="block text-xs text-gray-500">
												+KES {v.priceModifier.toLocaleString()}
											</span>
										)}
									</button>
								))}
							</div>
						</div>
					))}

					{/* Quantity & Add to Cart */}
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
							<button
								onClick={() => setQuantity(Math.max(1, quantity - 1))}
								className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
							>
								<Minus size={18} />
							</button>
							<span className="px-6 py-3 font-semibold">{quantity}</span>
							<button
								onClick={() =>
									setQuantity(Math.min(product.stock, quantity + 1))
								}
								className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
							>
								<Plus size={18} />
							</button>
						</div>

						<button
							onClick={handleAddToCart}
							disabled={product.stock === 0}
							className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<ShoppingCart size={20} />
							Add to Cart - KES {(currentPrice * quantity).toLocaleString()}
						</button>

						<button
							onClick={() => setIsInWishlist(!isInWishlist)}
							className={clsx(
								"p-3 rounded-lg border transition",
								isInWishlist
									? "border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20"
									: "border-gray-300 dark:border-gray-600 hover:border-red-500",
							)}
						>
							<Heart size={20} className={isInWishlist ? "fill-current" : ""} />
						</button>
					</div>

					{/* Added to cart toast */}
					<AnimatePresence>
						{showAddedToCart && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
								className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-card px-6 py-3 flex items-center gap-3"
							>
								<Check className="text-green-500" size={20} />
								<span>Added to cart!</span>
								<Link
									href="/cart"
									className="text-primary font-semibold hover:underline ml-2"
								>
									View Cart
								</Link>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Trust Badges */}
					<div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
						<div className="text-center">
							<Truck className="mx-auto mb-1 text-primary" size={24} />
							<p className="text-xs font-medium">Fast Delivery</p>
							<p className="text-xs text-gray-500">Nationwide</p>
						</div>
						<div className="text-center">
							<Shield className="mx-auto mb-1 text-primary" size={24} />
							<p className="text-xs font-medium">12 Month</p>
							<p className="text-xs text-gray-500">Warranty</p>
						</div>
						<div className="text-center">
							<RotateCcw className="mx-auto mb-1 text-primary" size={24} />
							<p className="text-xs font-medium">7-Day</p>
							<p className="text-xs text-gray-500">Returns</p>
						</div>
					</div>
				</div>
			</div>

			{/* Tabs Section */}
			<div className="glass-card mb-16 overflow-hidden">
				{/* Tab Navigation */}
				<div className="flex overflow-x-auto border-b border-white/10">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={clsx(
								"px-6 py-4 font-medium transition whitespace-nowrap",
								activeTab === tab.key
									? "text-primary border-b-2 border-primary"
									: "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
							)}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Tab Content */}
				<div className="p-6 md:p-8">
					{activeTab === "description" && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<h3 className="text-xl font-semibold mb-4">
								Product Description
							</h3>
							<p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
								{product.description}
							</p>
							<h4 className="font-semibold mb-3">Key Features</h4>
							<ul className="grid md:grid-cols-2 gap-2">
								{product.features.map((feature, i) => (
									<li
										key={i}
										className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
									>
										<Check
											size={16}
											className="text-green-500 mt-0.5 flex-shrink-0"
										/>
										{feature}
									</li>
								))}
							</ul>
						</motion.div>
					)}

					{activeTab === "specifications" && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<h3 className="text-xl font-semibold mb-6">
								Technical Specifications
							</h3>
							<div className="overflow-x-auto">
								<table className="w-full">
									<tbody>
										{Object.entries(product.specs).map(([key, value], i) => (
											<tr
												key={key}
												className={
													i % 2 === 0 ? "bg-black/5 dark:bg-white/5" : ""
												}
											>
												<td className="py-3 px-4 font-medium text-sm w-1/3">
													{key}
												</td>
												<td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
													{value}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</motion.div>
					)}

					{activeTab === "reviews" && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<div className="flex items-center justify-between mb-6">
								<h3 className="text-xl font-semibold">Customer Reviews</h3>
								<button className="btn-primary text-sm">Write a Review</button>
							</div>

							{/* Rating Summary */}
							<div className="glass-card p-6 mb-6">
								<div className="flex items-center gap-4">
									<span className="text-5xl font-bold">{product.rating}</span>
									<div>
										<div className="flex mb-1">
											{Array.from({ length: 5 }).map((_, i) => (
												<Star
													key={i}
													size={16}
													className={
														i < Math.floor(product.rating)
															? "text-yellow-500 fill-yellow-500"
															: "text-gray-300"
													}
												/>
											))}
										</div>
										<p className="text-sm text-gray-500">
											{product.reviewCount} reviews
										</p>
									</div>
								</div>
							</div>

							{/* Review List */}
							<div className="space-y-6">
								{mockReviews.map((review) => (
									<div key={review.id} className="glass-card p-6">
										<div className="flex items-center gap-3 mb-3">
											<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
												{review.user.name.charAt(0)}
											</div>
											<div>
												<p className="font-semibold">{review.user.name}</p>
												<div className="flex items-center gap-2">
													<div className="flex">
														{Array.from({ length: 5 }).map((_, i) => (
															<Star
																key={i}
																size={12}
																className={
																	i < review.rating
																		? "text-yellow-500 fill-yellow-500"
																		: "text-gray-300"
																}
															/>
														))}
													</div>
													{review.verified && (
														<span className="text-xs text-green-600 flex items-center gap-1">
															<Check size={12} /> Verified Purchase
														</span>
													)}
												</div>
											</div>
											<span className="ml-auto text-sm text-gray-500">
												{review.createdAt}
											</span>
										</div>
										<h4 className="font-medium mb-2">{review.title}</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											{review.comment}
										</p>
									</div>
								))}
							</div>
						</motion.div>
					)}

					{activeTab === "warranty" && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<h3 className="text-xl font-semibold mb-4">
								Warranty Information
							</h3>
							<div className="glass-card p-6">
								<div className="flex items-start gap-4">
									<Shield className="text-primary flex-shrink-0" size={32} />
									<div>
										<h4 className="font-semibold text-lg mb-2">
											{product.warranty}
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
											This product comes with a comprehensive warranty that
											covers manufacturing defects and hardware failures.
										</p>
										<ul className="space-y-2 text-sm">
											<li className="flex items-start gap-2">
												<Check size={14} className="text-green-500 mt-0.5" />
												Covers manufacturing defects
											</li>
											<li className="flex items-start gap-2">
												<Check size={14} className="text-green-500 mt-0.5" />
												Free repair or replacement
											</li>
											<li className="flex items-start gap-2">
												<Check size={14} className="text-green-500 mt-0.5" />
												Visit any authorized service center
											</li>
											<li className="flex items-start gap-2">
												<Check size={14} className="text-green-500 mt-0.5" />
												Keep your receipt for warranty claims
											</li>
										</ul>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{activeTab === "shipping" && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<h3 className="text-xl font-semibold mb-4">
								Shipping & Delivery
							</h3>
							<div className="grid md:grid-cols-2 gap-6">
								<div className="glass-card p-6">
									<Truck className="text-primary mb-3" size={28} />
									<h4 className="font-semibold mb-2">Nairobi & Surrounding</h4>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
										KES 200 - Same day delivery for orders before 2 PM
									</p>
									<p className="text-xs text-gray-500">
										Estimated: 1-2 business days
									</p>
								</div>
								<div className="glass-card p-6">
									<Truck className="text-primary mb-3" size={28} />
									<h4 className="font-semibold mb-2">Outside Nairobi</h4>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
										KES 500 - Shipped via partner courier
									</p>
									<p className="text-xs text-gray-500">
										Estimated: 2-5 business days
									</p>
								</div>
							</div>
							<div className="mt-6 p-4 glass-card">
								<h4 className="font-semibold mb-2">Return Policy</h4>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									7-day replacement guarantee for defective products. Items must
									be returned in original packaging with all accessories.
								</p>
							</div>
						</motion.div>
					)}
				</div>
			</div>

			<section>
				<h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
					{[
						{
							name: "AirPods Pro 2",
							price: 24999,
							image:
								"https://images.unsplash.com/photo-1606220588913-b3aacb434709?auto=format&fit=crop&w=800&q=80",
							href: "/products?category=accessories&subcategory=headphones",
						},
						{
							name: "iPhone 15",
							price: 139999,
							image:
								"https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
							href: "/products?category=phones&subcategory=iphone",
						},
						{
							name: "Samsung Galaxy Watch 6",
							price: 31999,
							image:
								"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
							href: "/products?category=accessories&subcategory=smartwatches",
						},
						{
							name: "Dell XPS 13",
							price: 209999,
							image:
								"https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=800&q=80",
							href: "/products?category=laptops&subcategory=dell",
						},
					].map((item) => (
						<Link
							key={item.name}
							href={item.href}
							className="glass-card block group"
						>
							<div className="relative h-40 w-full rounded-xl overflow-hidden mb-4">
								<Image
									src={getProductImage(item.image, item.name)}
									alt={item.name}
									fill
									className="object-cover group-hover:scale-105 transition-transform duration-500"
								/>
							</div>
							<h3 className="font-medium mb-2 group-hover:text-primary transition-colors">
								{item.name}
							</h3>
							<p className="text-primary font-semibold">
								KES {item.price.toLocaleString()}
							</p>
						</Link>
					))}
				</div>
			</section>
		</div>
	)
}
