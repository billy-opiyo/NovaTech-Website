"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import {
	ArrowLeft,
	Plus,
	X,
	Search,
	Check,
	Minus,
	Star,
	Zap,
	Truck,
	Monitor,
	Battery,
	Cpu,
	HardDrive,
} from "lucide-react"
import clsx from "clsx"

interface CompareProduct {
	id: string
	name: string
	brand: string
	image: string
	price: number
	discountedPrice?: number
	rating: number
	specs: Record<string, string>
}

const allSpecs = [
	"Processor",
	"RAM",
	"Storage",
	"Display",
	"Battery",
	"Camera",
	"OS",
	"Weight",
	"GPU",
	"Ports",
]

const mockCompareProducts: CompareProduct[] = [
	{
		id: "prod-1",
		name: "MacBook Air M3",
		brand: "Apple",
		image: "https://placehold.co/300x300/1e293b/white?text=MacBook+Air",
		price: 189999,
		discountedPrice: 174999,
		rating: 4.8,
		specs: {
			Processor: "Apple M3",
			RAM: "8GB Unified",
			Storage: "256GB SSD",
			Display: '13.6" Liquid Retina',
			Battery: "Up to 18 hours",
			Weight: "1.24 kg",
			GPU: "8-core",
			Ports: "2x Thunderbolt, MagSafe",
			Camera: "1080p FaceTime HD",
			OS: "macOS Sonoma",
		},
	},
	{
		id: "prod-2",
		name: "Dell XPS 15",
		brand: "Dell",
		image: "https://placehold.co/300x300/1e293b/white?text=Dell+XPS",
		price: 159999,
		rating: 4.5,
		specs: {
			Processor: "Intel Core i7-13700H",
			RAM: "16GB DDR5",
			Storage: "512GB SSD",
			Display: '15.6" OLED 3.5K',
			Battery: "Up to 12 hours",
			Weight: "1.86 kg",
			GPU: "Intel Iris Xe",
			Ports: "3x Thunderbolt 4, USB-C",
			Camera: "HD IR Camera",
			OS: "Windows 11",
		},
	},
	{
		id: "prod-3",
		name: "HP Spectre x360",
		brand: "HP",
		image: "https://placehold.co/300x300/1e293b/white?text=HP+Spectre",
		price: 144999,
		discountedPrice: 134999,
		rating: 4.6,
		specs: {
			Processor: "Intel Core i7-1355U",
			RAM: "16GB LPDDR4x",
			Storage: "1TB SSD",
			Display: '13.5" OLED 3K2K',
			Battery: "Up to 15 hours",
			Weight: "1.36 kg",
			GPU: "Intel Iris Xe",
			Ports: "2x Thunderbolt 4, USB-A",
			Camera: "HP Wide Vision",
			OS: "Windows 11",
		},
	},
]

export default function ComparePage() {
	const [compareItems, setCompareItems] = useState<CompareProduct[]>([])
	const [searchOpen, setSearchOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")

	const addToCompare = (product: CompareProduct) => {
		if (
			compareItems.length < 4 &&
			!compareItems.find((p) => p.id === product.id)
		) {
			setCompareItems([...compareItems, product])
		}
		setSearchOpen(false)
		setSearchQuery("")
	}

	const removeFromCompare = (productId: string) => {
		setCompareItems(compareItems.filter((p) => p.id !== productId))
	}

	const getBestValue = (spec: string): string | null => {
		const numericSpecs = ["RAM", "Storage", "Battery", "Display"]
		if (!numericSpecs.includes(spec)) return null
		return null
	}

	return (
		<div>
			<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 sm:mb-8">
				<Link
					href="/products"
					className="flex items-center gap-1 text-gray-500 hover:text-primary transition text-sm sm:text-base"
				>
					<ArrowLeft size={18} /> Back to Products
				</Link>
				<span className="hidden sm:inline text-gray-400">|</span>
				<h1 className="text-xl sm:text-2xl font-bold">Compare Products</h1>
			</div>

			{compareItems.length === 0 ? (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center py-20"
				>
					<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
						<Plus size={40} className="text-gray-400" />
					</div>
					<h2 className="text-xl sm:text-2xl font-bold mb-4">
						Compare Products
					</h2>
					<p className="text-gray-500 mb-8 max-w-md mx-auto text-sm sm:text-base">
						Add products to compare their specifications side by side. You can
						compare up to 4 products at once.
					</p>
					<button
						onClick={() => setSearchOpen(true)}
						className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
					>
						<Plus size={18} /> Add Products
					</button>
				</motion.div>
			) : (
				<>
					<div className="mb-8">
						<button
							onClick={() => setSearchOpen(true)}
							disabled={compareItems.length >= 4}
							className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
						>
							<Plus size={18} /> Add Product ({compareItems.length}/4)
						</button>
					</div>

					<div className="overflow-x-auto">
						{/* Responsive: show stacked cards on small screens */}
						{/* detect small screens in JS */}
						<CompareGrid
							compareItems={compareItems}
							allSpecs={allSpecs}
							removeFromCompare={removeFromCompare}
							getBestValue={getBestValue}
						/>
					</div>
				</>
			)}

			<AnimatePresence>
				{searchOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/50 z-50"
							onClick={() => setSearchOpen(false)}
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
						>
							<div className="glass-card p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-lg font-semibold">
										Add Product to Compare
									</h3>
									<button onClick={() => setSearchOpen(false)}>
										<X size={20} />
									</button>
								</div>

								<div className="relative mb-4">
									<Search
										className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
										size={18}
									/>
									<input
										type="text"
										placeholder="Search products..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
										autoFocus
									/>
								</div>

								<div className="max-h-80 overflow-y-auto space-y-2">
									{mockCompareProducts
										.filter(
											(p) =>
												p.name
													.toLowerCase()
													.includes(searchQuery.toLowerCase()) &&
												!compareItems.find((c) => c.id === p.id),
										)
										.map((product) => (
											<button
												key={product.id}
												onClick={() => addToCompare(product)}
												className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition text-left"
											>
												<div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
													<Image
														src={product.image}
														alt={product.name}
														fill
														className="object-cover"
													/>
												</div>
												<div className="flex-1 min-w-0">
													<p className="font-medium truncate">{product.name}</p>
													<p className="text-sm text-gray-500">
														{product.brand}
													</p>
												</div>
												<Plus size={18} className="text-primary" />
											</button>
										))}
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	)
}

function CompareGrid({
	compareItems,
	allSpecs,
	removeFromCompare,
	getBestValue,
}: {
	compareItems: CompareProduct[]
	allSpecs: string[]
	removeFromCompare: (id: string) => void
	getBestValue: (spec: string) => string | null
}) {
	const [isSmall, setIsSmall] = useState(false)

	useEffect(() => {
		const update = () => setIsSmall(window.innerWidth < 640)
		update()
		window.addEventListener("resize", update)
		return () => window.removeEventListener("resize", update)
	}, [])

	if (isSmall) {
		return (
			<div className="space-y-4">
				{compareItems.map((product) => (
					<div key={product.id} className="glass-card p-4">
						<div className="flex items-center gap-4">
							<div className="relative h-20 w-20 rounded-xl overflow-hidden bg-gray-100">
								<Image
									src={product.image}
									alt={product.name}
									fill
									className="object-cover"
								/>
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs text-gray-500 uppercase tracking-wider">
									{product.brand}
								</p>
								<h3 className="font-semibold text-sm line-clamp-2">
									{product.name}
								</h3>
								<div className="flex items-center gap-2 mt-1">
									<Star size={14} className="text-yellow-500 fill-yellow-500" />
									<span className="text-sm font-medium">{product.rating}</span>
								</div>
								<div className="mt-2">
									{product.discountedPrice ? (
										<>
											<span className="font-bold text-primary">
												KES {product.discountedPrice.toLocaleString()}
											</span>
											<br />
											<span className="text-xs line-through text-gray-400">
												KES {product.price.toLocaleString()}
											</span>
										</>
									) : (
										<span className="font-bold">
											KES {product.price.toLocaleString()}
										</span>
									)}
								</div>
							</div>
							<button
								onClick={() => removeFromCompare(product.id)}
								className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition"
							>
								<X size={16} />
							</button>
						</div>

						<div className="grid grid-cols-2 gap-2 mt-4 text-sm">
							{allSpecs.map((spec) => (
								<div key={spec} className="border-t pt-2">
									<div className="text-xs text-gray-500 font-medium">
										{spec}
									</div>
									<div className="mt-1">{product.specs[spec] || "-"}</div>
								</div>
							))}
						</div>

						<div className="mt-4">
							<Link
								href={`/products/${product.id}`}
								className="btn-primary text-sm w-full block text-center"
							>
								View Details
							</Link>
						</div>
					</div>
				))}
			</div>
		)
	}

	return (
		<div className="glass-card p-4 sm:p-6 min-w-[760px]">
			<div
				className="grid"
				style={{
					gridTemplateColumns: `200px repeat(${compareItems.length}, 1fr)`,
				}}
			>
				<div className="p-4 font-semibold text-gray-500">Product</div>
				{compareItems.map((product) => (
					<div key={product.id} className="p-4 text-center relative">
						<button
							onClick={() => removeFromCompare(product.id)}
							className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition"
						>
							<X size={16} />
						</button>
						<div className="relative h-32 w-32 mx-auto mb-3 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
							<Image
								src={product.image}
								alt={product.name}
								fill
								className="object-cover"
							/>
						</div>
						<p className="text-xs text-gray-500 uppercase tracking-wider">
							{product.brand}
						</p>
						<h3 className="font-semibold text-sm mt-1 line-clamp-2">
							{product.name}
						</h3>
						<div className="flex items-center justify-center gap-1 mt-2">
							<Star size={14} className="text-yellow-500 fill-yellow-500" />
							<span className="text-sm font-medium">{product.rating}</span>
						</div>
						<div className="mt-2">
							{product.discountedPrice ? (
								<>
									<span className="font-bold text-primary">
										KES {product.discountedPrice.toLocaleString()}
									</span>
									<br />
									<span className="text-xs line-through text-gray-400">
										KES {product.price.toLocaleString()}
									</span>
								</>
							) : (
								<span className="font-bold">
									KES {product.price.toLocaleString()}
								</span>
							)}
						</div>
					</div>
				))}

				{allSpecs.map((spec) => (
					<div key={spec} className="contents">
						<div className="p-4 font-medium text-sm border-t border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5">
							{spec}
						</div>
						{compareItems.map((product) => {
							const value = product.specs[spec]
							const isBest = getBestValue(spec)
							return (
								<div
									key={`${product.id}-${spec}`}
									className={clsx(
										"p-4 text-sm text-center border-t border-gray-200 dark:border-gray-700",
										isBest === product.id && "bg-green-500/5",
									)}
								>
									{value || (
										<Minus size={14} className="mx-auto text-gray-300" />
									)}
									{isBest === product.id && (
										<Check size={12} className="inline ml-1 text-green-500" />
									)}
								</div>
							)
						})}
					</div>
				))}

				<div className="p-4 border-t border-gray-200 dark:border-gray-700"></div>
				{compareItems.map((product) => (
					<div
						key={`action-${product.id}`}
						className="p-4 text-center border-t border-gray-200 dark:border-gray-700"
					>
						<Link
							href={`/products/${product.id}`}
							className="btn-primary text-sm w-full block text-center"
						>
							View Details
						</Link>
					</div>
				))}
			</div>
		</div>
	)
}
