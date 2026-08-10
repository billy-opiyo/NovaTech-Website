"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
	Search,
	SlidersHorizontal,
	X,
	Star,
	Grid3X3,
	List,
	ChevronDown,
	Filter,
} from "lucide-react"
import clsx from "clsx"

// Types
interface Product {
	id: string
	name: string
	slug: string
	price: number
	discountedPrice?: number
	brand: string
	images: string[]
	category: { name: string; slug: string }
	rating?: number
	reviewCount?: number
	stock: number
	specs: Record<string, string>
}

interface FilterState {
	brands: string[]
	priceRange: [number, number]
	category: string
	sortBy: "price-asc" | "price-desc" | "newest" | "rating"
	inStock: boolean
	onSale: boolean
}

const brands = [
	"Apple",
	"Samsung",
	"Sony",
	"LG",
	"Dell",
	"HP",
	"Lenovo",
	"ASUS",
	"OnePlus",
	"Xiaomi",
]
const categories = [
	{ name: "All Categories", slug: "" },
	{ name: "Phones", slug: "phones" },
	{ name: "Laptops", slug: "laptops" },
	{ name: "Tablets", slug: "tablets" },
	{ name: "Accessories", slug: "accessories" },
	{ name: "Gaming", slug: "gaming" },
]

const sortOptions = [
	{ value: "newest", label: "Newest" },
	{ value: "price-asc", label: "Price: Low to High" },
	{ value: "price-desc", label: "Price: High to Low" },
	{ value: "rating", label: "Top Rated" },
]

// Mock products for demonstration
const mockProducts: Product[] = Array.from({ length: 24 }, (_, i) => ({
	id: `prod-${i + 1}`,
	name: [
		"iPhone 15 Pro Max",
		"Samsung Galaxy S24 Ultra",
		"MacBook Air M3",
		"Dell XPS 15",
		"Sony WH-1000XM5",
		"iPad Pro M2",
		"Samsung Galaxy Tab S9",
		"Apple Watch Ultra 2",
		'LG OLED C3 65"',
		"PlayStation 5",
		"ASUS ROG Gaming Laptop",
		"HP Spectre x360",
		"OnePlus 12",
		"Xiaomi 14 Pro",
		"AirPods Pro 2",
		"Samsung Galaxy Buds3 Pro",
		"Lenovo ThinkPad X1",
		"Dell UltraSharp Monitor",
		"Canon EOS R6",
		"DJI Mini 4 Pro",
		"Nintendo Switch OLED",
		"JBL Charge 5",
		"Razer DeathAdder V3",
		"Logitech MX Master 3S",
	][i % 24],
	slug: `product-${i + 1}`,
	price: Math.floor(Math.random() * 150000) + 5000,
	discountedPrice:
		Math.random() > 0.6 ? Math.floor(Math.random() * 130000) + 3000 : undefined,
	brand: brands[Math.floor(Math.random() * brands.length)],
	images: [
		"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80",
	],
	category: categories[Math.floor(Math.random() * 5) + 1],
	rating: Math.random() * 2 + 3,
	reviewCount: Math.floor(Math.random() * 500) + 10,
	stock: Math.floor(Math.random() * 50),
	specs: {
		Processor: "Apple M3",
		RAM: "16GB",
		Storage: "512GB SSD",
		Display: '15.6" FHD',
	},
}))

export default function ProductsClient() {
	const searchParams = useSearchParams()
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
	const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
	const [filters, setFilters] = useState<FilterState>({
		brands: [],
		priceRange: [0, 200000],
		category: searchParams.get("category") || "",
		sortBy: "newest",
		inStock: false,
		onSale: false,
	})
	const [filteredProducts, setFilteredProducts] =
		useState<Product[]>(mockProducts)
	const [isLoading, setIsLoading] = useState(false)

	const applyFilters = useCallback(() => {
		setIsLoading(true)
		setTimeout(() => {
			let results = [...mockProducts]

			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				results = results.filter(
					(p) =>
						p.name.toLowerCase().includes(query) ||
						p.brand.toLowerCase().includes(query) ||
						p.category.name.toLowerCase().includes(query),
				)
			}

			if (filters.category) {
				results = results.filter((p) => p.category.slug === filters.category)
			}

			if (filters.brands.length > 0) {
				results = results.filter((p) => filters.brands.includes(p.brand))
			}

			results = results.filter((p) => {
				const price = p.discountedPrice || p.price
				return price >= filters.priceRange[0] && price <= filters.priceRange[1]
			})

			if (filters.inStock) {
				results = results.filter((p) => p.stock > 0)
			}

			if (filters.onSale) {
				results = results.filter((p) => p.discountedPrice !== undefined)
			}

			switch (filters.sortBy) {
				case "price-asc":
					results.sort(
						(a, b) =>
							(a.discountedPrice || a.price) - (b.discountedPrice || b.price),
					)
					break
				case "price-desc":
					results.sort(
						(a, b) =>
							(b.discountedPrice || b.price) - (a.discountedPrice || a.price),
					)
					break
				case "rating":
					results.sort((a, b) => (b.rating || 0) - (a.rating || 0))
					break
				default:
					results.sort(
						(a, b) =>
							parseInt(b.id.split("-")[1]) - parseInt(a.id.split("-")[1]),
					)
			}

			setFilteredProducts(results)
			setIsLoading(false)
		}, 300)
	}, [searchQuery, filters])

	useEffect(() => {
		applyFilters()
	}, [applyFilters])

	const toggleBrand = (brand: string) => {
		setFilters((prev) => ({
			...prev,
			brands: prev.brands.includes(brand)
				? prev.brands.filter((b) => b !== brand)
				: [...prev.brands, brand],
		}))
	}

	const clearFilters = () => {
		setFilters({
			brands: [],
			priceRange: [0, 200000],
			category: "",
			sortBy: "newest",
			inStock: false,
			onSale: false,
		})
		setSearchQuery("")
	}

	const activeFilterCount =
		(filters.brands.length > 0 ? 1 : 0) +
		(filters.category ? 1 : 0) +
		(filters.inStock ? 1 : 0) +
		(filters.onSale ? 1 : 0) +
		(filters.priceRange[0] > 0 || filters.priceRange[1] < 200000 ? 1 : 0)

	return (
		<div className="min-h-screen">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl md:text-4xl font-bold mb-2">All Products</h1>
				<p className="text-gray-600 dark:text-gray-400">
					{filteredProducts.length} products found
				</p>
			</div>

			{/* Search & Sort Bar */}
			<div className="glass-card mb-8 p-4">
				<div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
					<div className="flex-1 relative">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							placeholder='Search products... e.g., "i7 laptop 16GB RAM"'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary transition"
						/>
					</div>

					<div className="flex gap-2 items-center">
						<select
							value={filters.sortBy}
							onChange={(e) =>
								setFilters({
									...filters,
									sortBy: e.target.value as FilterState["sortBy"],
								})
							}
							className="px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
						>
							{sortOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>

						<button
							onClick={() => setViewMode("grid")}
							className={clsx(
								"p-3 rounded-lg border transition",
								viewMode === "grid"
									? "bg-primary text-white border-primary"
									: "bg-white/10 border-white/20 hover:bg-white/20",
							)}
						>
							<Grid3X3 size={18} />
						</button>
						<button
							onClick={() => setViewMode("list")}
							className={clsx(
								"p-3 rounded-lg border transition",
								viewMode === "list"
									? "bg-primary text-white border-primary"
									: "bg-white/10 border-white/20 hover:bg-white/20",
							)}
						>
							<List size={18} />
						</button>

						<button
							onClick={() => setMobileFiltersOpen(true)}
							className="md:hidden p-3 rounded-lg border border-white/20 bg-white/10 relative"
						>
							<Filter size={18} />
							{activeFilterCount > 0 && (
								<span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
									{activeFilterCount}
								</span>
							)}
						</button>
					</div>
				</div>

				{activeFilterCount > 0 && (
					<div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
						{filters.category && (
							<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
								{categories.find((c) => c.slug === filters.category)?.name}
								<button
									onClick={() => setFilters({ ...filters, category: "" })}
								>
									<X size={14} />
								</button>
							</span>
						)}
						{filters.brands.map((brand) => (
							<span
								key={brand}
								className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm"
							>
								{brand}
								<button onClick={() => toggleBrand(brand)}>
									<X size={14} />
								</button>
							</span>
						))}
						{filters.inStock && (
							<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-600 text-sm">
								In Stock
								<button
									onClick={() => setFilters({ ...filters, inStock: false })}
								>
									<X size={14} />
								</button>
							</span>
						)}
						{filters.onSale && (
							<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-600 text-sm">
								On Sale
								<button
									onClick={() => setFilters({ ...filters, onSale: false })}
								>
									<X size={14} />
								</button>
							</span>
						)}
						<button
							onClick={clearFilters}
							className="text-sm text-gray-500 hover:text-primary underline"
						>
							Clear all
						</button>
					</div>
				)}
			</div>

			<div className="flex gap-8">
				<aside className="hidden md:block w-64 flex-shrink-0">
					<div className="glass-card p-6 sticky top-24 space-y-6">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<SlidersHorizontal size={18} /> Filters
						</h3>

						<div>
							<h4 className="font-medium mb-3">Category</h4>
							<div className="space-y-2">
								{categories.map((cat) => (
									<button
										key={cat.slug}
										onClick={() =>
											setFilters({ ...filters, category: cat.slug })
										}
										className={clsx(
											"block w-full text-left px-3 py-2 rounded-lg transition text-sm",
											filters.category === cat.slug
												? "bg-primary text-white"
												: "hover:bg-white/10",
										)}
									>
										{cat.name}
									</button>
								))}
							</div>
						</div>

						<div>
							<h4 className="font-medium mb-3">Price Range (KES)</h4>
							<div className="space-y-3">
								<input
									type="range"
									min={0}
									max={200000}
									step={5000}
									value={filters.priceRange[1]}
									onChange={(e) =>
										setFilters({
											...filters,
											priceRange: [
												filters.priceRange[0],
												parseInt(e.target.value),
											],
										})
									}
									className="w-full accent-primary"
								/>
								<div className="flex justify-between text-sm text-gray-500">
									<span>KES {filters.priceRange[0].toLocaleString()}</span>
									<span>KES {filters.priceRange[1].toLocaleString()}</span>
								</div>
							</div>
						</div>

						<div>
							<h4 className="font-medium mb-3">Brand</h4>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{brands.map((brand) => (
									<label
										key={brand}
										className="flex items-center gap-2 cursor-pointer text-sm"
									>
										<input
											type="checkbox"
											checked={filters.brands.includes(brand)}
											onChange={() => toggleBrand(brand)}
											className="accent-primary rounded"
										/>
										{brand}
									</label>
								))}
							</div>
						</div>

						<div className="space-y-3">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={filters.inStock}
									onChange={() =>
										setFilters({ ...filters, inStock: !filters.inStock })
									}
									className="accent-primary rounded"
								/>
								<span className="text-sm">In Stock Only</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={filters.onSale}
									onChange={() =>
										setFilters({ ...filters, onSale: !filters.onSale })
									}
									className="accent-primary rounded"
								/>
								<span className="text-sm">On Sale</span>
							</label>
						</div>
					</div>
				</aside>

				<div className="flex-1">
					<AnimatePresence mode="wait">
						{isLoading ? (
							<motion.div
								key="loading"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="grid grid-cols-2 lg:grid-cols-3 gap-6"
							>
								{Array.from({ length: 9 }).map((_, i) => (
									<div key={i} className="glass-card animate-pulse">
										<div className="h-48 bg-gray-300 dark:bg-gray-600 rounded-xl mb-4" />
										<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2" />
										<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
									</div>
								))}
							</motion.div>
						) : viewMode === "grid" ? (
							<motion.div
								key="grid"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="grid grid-cols-2 lg:grid-cols-3 gap-6"
							>
								{filteredProducts.map((product, i) => (
									<ProductCard key={product.id} product={product} index={i} />
								))}
							</motion.div>
						) : (
							<motion.div
								key="list"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="space-y-4"
							>
								{filteredProducts.map((product, i) => (
									<ProductListItem
										key={product.id}
										product={product}
										index={i}
									/>
								))}
							</motion.div>
						)}
					</AnimatePresence>

					{filteredProducts.length === 0 && !isLoading && (
						<div className="text-center py-20 glass-card">
							<Search className="mx-auto mb-4 text-gray-400" size={48} />
							<h3 className="text-xl font-semibold mb-2">No products found</h3>
							<p className="text-gray-500 mb-4">
								Try adjusting your search or filters
							</p>
							<button onClick={clearFilters} className="btn-primary">
								Clear Filters
							</button>
						</div>
					)}

					{filteredProducts.length > 12 && (
						<div className="flex justify-center gap-2 mt-8">
							{[1, 2, 3, "...", 5].map((page, i) => (
								<button
									key={i}
									className={clsx(
										"w-10 h-10 rounded-lg transition",
										page === 1
											? "bg-primary text-white"
											: "glass-card hover:bg-white/20",
									)}
								>
									{page}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			<AnimatePresence>
				{mobileFiltersOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/50 z-40 md:hidden"
							onClick={() => setMobileFiltersOpen(false)}
						/>
						<motion.aside
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 25 }}
							className="fixed right-0 top-0 bottom-0 w-80 z-50 bg-white dark:bg-dark-surface p-6 overflow-y-auto md:hidden"
						>
							<div className="flex justify-between items-center mb-6">
								<h3 className="font-semibold text-lg">Filters</h3>
								<button onClick={() => setMobileFiltersOpen(false)}>
									<X size={24} />
								</button>
							</div>

							<div className="space-y-6">
								<div>
									<h4 className="font-medium mb-3">Category</h4>
									<div className="space-y-2">
										{categories.map((cat) => (
											<button
												key={cat.slug}
												onClick={() =>
													setFilters({ ...filters, category: cat.slug })
												}
												className={clsx(
													"block w-full text-left px-3 py-2 rounded-lg transition text-sm",
													filters.category === cat.slug
														? "bg-primary text-white"
														: "hover:bg-gray-100 dark:hover:bg-gray-800",
												)}
											>
												{cat.name}
											</button>
										))}
									</div>
								</div>

								<div>
									<h4 className="font-medium mb-3">Price Range (KES)</h4>
									<input
										type="range"
										min={0}
										max={200000}
										step={5000}
										value={filters.priceRange[1]}
										onChange={(e) =>
											setFilters({
												...filters,
												priceRange: [
													filters.priceRange[0],
													parseInt(e.target.value),
												],
											})
										}
										className="w-full accent-primary"
									/>
									<div className="flex justify-between text-sm text-gray-500 mt-2">
										<span>KES {filters.priceRange[0].toLocaleString()}</span>
										<span>KES {filters.priceRange[1].toLocaleString()}</span>
									</div>
								</div>

								<div>
									<h4 className="font-medium mb-3">Brand</h4>
									<div className="space-y-2 max-h-48 overflow-y-auto">
										{brands.map((brand) => (
											<label
												key={brand}
												className="flex items-center gap-2 cursor-pointer text-sm"
											>
												<input
													type="checkbox"
													checked={filters.brands.includes(brand)}
													onChange={() => toggleBrand(brand)}
													className="accent-primary rounded"
												/>
												{brand}
											</label>
										))}
									</div>
								</div>

								<div className="space-y-3">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={filters.inStock}
											onChange={() =>
												setFilters({ ...filters, inStock: !filters.inStock })
											}
											className="accent-primary rounded"
										/>
										<span className="text-sm">In Stock Only</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={filters.onSale}
											onChange={() =>
												setFilters({ ...filters, onSale: !filters.onSale })
											}
											className="accent-primary rounded"
										/>
										<span className="text-sm">On Sale</span>
									</label>
								</div>

								<button
									onClick={() => {
										setMobileFiltersOpen(false)
									}}
									className="btn-primary w-full"
								>
									Apply Filters ({filteredProducts.length})
								</button>
							</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>
		</div>
	)
}

function ProductCard({ product, index }: { product: Product; index: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.05 }}
		>
			<Link
				href={`/products/${product.slug}`}
				className="glass-card block group h-full"
			>
				<div className="relative h-52 w-full mb-4 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
					<Image
						src={product.images[0]}
						alt={product.name}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-500"
					/>
					{product.discountedPrice && (
						<span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
							SALE
						</span>
					)}
					{product.stock <= 5 && product.stock > 0 && (
						<span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
							Only {product.stock} left
						</span>
					)}
					{product.stock === 0 && (
						<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
							<span className="text-white font-semibold text-lg">
								Out of Stock
							</span>
						</div>
					)}
				</div>

				<p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
					{product.brand}
				</p>
				<h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
					{product.name}
				</h3>

				<div className="flex items-center gap-1 mb-2">
					<div className="flex">
						{Array.from({ length: 5 }).map((_, i) => (
							<Star
								key={i}
								size={12}
								className={
									i < Math.floor(product.rating || 0)
										? "text-yellow-500 fill-yellow-500"
										: "text-gray-300"
								}
							/>
						))}
					</div>
					<span className="text-xs text-gray-500">({product.reviewCount})</span>
				</div>

				<div className="flex items-baseline gap-2">
					{product.discountedPrice ? (
						<>
							<span className="text-lg font-bold text-primary">
								KES {product.discountedPrice.toLocaleString()}
							</span>
							<span className="text-sm line-through text-gray-400">
								KES {product.price.toLocaleString()}
							</span>
						</>
					) : (
						<span className="text-lg font-bold">
							KES {product.price.toLocaleString()}
						</span>
					)}
				</div>
			</Link>
		</motion.div>
	)
}

function ProductListItem({
	product,
	index,
}: {
	product: Product
	index: number
}) {
	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.05 }}
		>
			<Link
				href={`/products/${product.slug}`}
				className="glass-card flex gap-6 group"
			>
				<div className="relative h-40 w-40 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
					<Image
						src={product.images[0]}
						alt={product.name}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-500"
					/>
				</div>
				<div className="flex-1 flex flex-col justify-between py-2">
					<div>
						<p className="text-xs text-gray-500 uppercase tracking-wider">
							{product.brand}
						</p>
						<h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
							{product.name}
						</h3>
						<div className="flex items-center gap-1 mb-2">
							<div className="flex">
								{Array.from({ length: 5 }).map((_, i) => (
									<Star
										key={i}
										size={14}
										className={
											i < Math.floor(product.rating || 0)
												? "text-yellow-500 fill-yellow-500"
												: "text-gray-300"
										}
									/>
								))}
							</div>
							<span className="text-sm text-gray-500">
								({product.reviewCount} reviews)
							</span>
						</div>
						<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
							{Object.entries(product.specs)
								.map(([key, val]) => `${key}: ${val}`)
								.join(" | ")}
						</p>
					</div>
					<div className="flex items-baseline gap-2 mt-2">
						{product.discountedPrice ? (
							<>
								<span className="text-xl font-bold text-primary">
									KES {product.discountedPrice.toLocaleString()}
								</span>
								<span className="text-sm line-through text-gray-400">
									KES {product.price.toLocaleString()}
								</span>
							</>
						) : (
							<span className="text-xl font-bold">
								KES {product.price.toLocaleString()}
							</span>
						)}
					</div>
				</div>
			</Link>
		</motion.div>
	)
}
