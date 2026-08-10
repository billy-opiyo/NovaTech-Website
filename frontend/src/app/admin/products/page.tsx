"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
	Plus,
	Search,
	Edit,
	Trash2,
	Package,
	ChevronDown,
	Eye,
	Copy,
	Archive,
	Star,
	AlertCircle,
	CheckCircle2,
	XCircle,
	Download,
	Upload,
} from "lucide-react"
import clsx from "clsx"

interface AdminProduct {
	id: string
	name: string
	brand: string
	category: string
	price: number
	stock: number
	status: "active" | "draft" | "out_of_stock" | "archived"
	image: string
	sales: number
	rating: number
	lastUpdated: string
}

const mockProducts: AdminProduct[] = [
	{
		id: "prod-1",
		name: "iPhone 15 Pro Max",
		brand: "Apple",
		category: "Phones",
		price: 159999,
		stock: 25,
		status: "active",
		image:
			"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=200&q=80",
		sales: 145,
		rating: 4.8,
		lastUpdated: "2024-08-20",
	},
	{
		id: "prod-2",
		name: "MacBook Air M3",
		brand: "Apple",
		category: "Laptops",
		price: 189999,
		stock: 15,
		status: "active",
		image:
			"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80",
		sales: 89,
		rating: 4.9,
		lastUpdated: "2024-08-19",
	},
	{
		id: "prod-3",
		name: "Samsung Galaxy S24 Ultra",
		brand: "Samsung",
		category: "Phones",
		price: 134999,
		stock: 30,
		status: "active",
		image:
			"https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=200&q=80",
		sales: 112,
		rating: 4.7,
		lastUpdated: "2024-08-18",
	},
	{
		id: "prod-4",
		name: "Sony WH-1000XM5",
		brand: "Sony",
		category: "Accessories",
		price: 34999,
		stock: 0,
		status: "out_of_stock",
		image:
			"https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=200&q=80",
		sales: 67,
		rating: 4.6,
		lastUpdated: "2024-08-17",
	},
	{
		id: "prod-5",
		name: "Dell XPS 15",
		brand: "Dell",
		category: "Laptops",
		price: 159999,
		stock: 8,
		status: "active",
		image:
			"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=200&q=80",
		sales: 34,
		rating: 4.5,
		lastUpdated: "2024-08-16",
	},
	{
		id: "prod-6",
		name: "PlayStation 5",
		brand: "Sony",
		category: "Gaming",
		price: 74999,
		stock: 10,
		status: "active",
		image:
			"https://images.unsplash.com/photo-1587202372775-f4b746c6bd84?auto=format&fit=crop&w=200&q=80",
		sales: 78,
		rating: 4.9,
		lastUpdated: "2024-08-15",
	},
	{
		id: "prod-7",
		name: "Old Model Headphones",
		brand: "Generic",
		category: "Accessories",
		price: 2999,
		stock: 50,
		status: "archived",
		image:
			"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80",
		sales: 12,
		rating: 3.2,
		lastUpdated: "2024-06-01",
	},
	{
		id: "prod-8",
		name: "New Gaming Mouse",
		brand: "Razer",
		category: "Gaming",
		price: 8999,
		stock: 100,
		status: "draft",
		image:
			"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80",
		sales: 0,
		rating: 0,
		lastUpdated: "2024-08-21",
	},
]

const statusFilters = ["All", "Active", "Draft", "Out of Stock", "Archived"]

export default function AdminProductsPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [selectedProducts, setSelectedProducts] = useState<string[]>([])
	const [sortBy, setSortBy] = useState("newest")
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [productToDelete, setProductToDelete] = useState<string | null>(null)

	const filteredProducts = mockProducts.filter((product) => {
		const matchesSearch =
			product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			product.brand.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" ||
			product.status === statusFilter.toLowerCase().replace(" ", "_")
		return matchesSearch && matchesStatus
	})

	const toggleSelectAll = () => {
		if (selectedProducts.length === filteredProducts.length) {
			setSelectedProducts([])
		} else {
			setSelectedProducts(filteredProducts.map((product) => product.id))
		}
	}

	const toggleSelect = (id: string) => {
		setSelectedProducts((prev) =>
			prev.includes(id)
				? prev.filter((product) => product !== id)
				: [...prev, id],
		)
	}

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			active: "bg-green-500/20 text-green-600",
			draft: "bg-gray-500/20 text-gray-600",
			out_of_stock: "bg-red-500/20 text-red-600",
			archived: "bg-yellow-500/20 text-yellow-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			active: <CheckCircle2 size={14} />,
			draft: <Edit size={14} />,
			out_of_stock: <XCircle size={14} />,
			archived: <Archive size={14} />,
		}
		return icons[status] || null
	}

	return (
		<div>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Products</h1>
					<p className="text-gray-500 mt-1">Manage your product catalog</p>
				</div>
				<div className="flex gap-3">
					<button className="btn-primary flex items-center gap-2">
						<Plus size={18} /> Add Product
					</button>
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Upload size={18} /> Import
					</button>
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{
						label: "Total Products",
						value: "248",
						icon: Package,
						color: "text-blue-500",
					},
					{
						label: "Active",
						value: "195",
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "Out of Stock",
						value: "23",
						icon: AlertCircle,
						color: "text-red-500",
					},
					{ label: "Drafts", value: "30", icon: Edit, color: "text-gray-500" },
				].map((stat, index) => (
					<motion.div
						key={stat.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
						className="glass-card p-4"
					>
						<div className="flex items-center gap-3">
							<stat.icon className={stat.color} size={24} />
							<div>
								<p className="text-2xl font-bold">{stat.value}</p>
								<p className="text-xs text-gray-500">{stat.label}</p>
							</div>
						</div>
					</motion.div>
				))}
			</div>

			<div className="glass-card p-4 mb-6">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="relative flex-1">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							placeholder="Search products by name or brand..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
					<div className="flex gap-2 overflow-x-auto">
						{statusFilters.map((filter) => (
							<button
								key={filter}
								onClick={() => setStatusFilter(filter)}
								className={clsx(
									"px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
									statusFilter === filter
										? "bg-primary text-white"
										: "bg-white/10 hover:bg-white/20",
								)}
							>
								{filter}
							</button>
						))}
					</div>
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm focus:outline-none"
					>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
						<option value="price-asc">Price: Low-High</option>
						<option value="price-desc">Price: High-Low</option>
						<option value="sales">Best Selling</option>
					</select>
				</div>

				{selectedProducts.length > 0 && (
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
						<span className="text-sm text-gray-500">
							{selectedProducts.length} selected
						</span>
						<button className="text-sm text-red-500 hover:text-red-600">
							Delete Selected
						</button>
						<button className="text-sm text-primary hover:underline">
							Archive Selected
						</button>
					</div>
				)}
			</div>

			<div className="glass-card overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="p-4 text-left">
									<input
										type="checkbox"
										checked={
											selectedProducts.length === filteredProducts.length &&
											filteredProducts.length > 0
										}
										onChange={toggleSelectAll}
										className="accent-primary rounded"
									/>
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Product
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Category
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Price
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Stock
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Status
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Sales
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Rating
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredProducts.map((product, index) => (
								<motion.tr
									key={product.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.03 }}
									className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition"
								>
									<td className="p-4">
										<input
											type="checkbox"
											checked={selectedProducts.includes(product.id)}
											onChange={() => toggleSelect(product.id)}
											className="accent-primary rounded"
										/>
									</td>
									<td className="p-4">
										<div className="flex items-center gap-3">
											<div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
												<Image
													src={product.image}
													alt={product.name}
													fill
													className="object-cover"
												/>
											</div>
											<div>
												<p className="font-medium text-sm">{product.name}</p>
												<p className="text-xs text-gray-500">{product.brand}</p>
											</div>
										</div>
									</td>
									<td className="p-4 text-sm">{product.category}</td>
									<td className="p-4 text-sm font-medium">
										KES {product.price.toLocaleString()}
									</td>
									<td className="p-4">
										<span
											className={clsx(
												"text-sm font-medium",
												product.stock === 0
													? "text-red-500"
													: product.stock <= 10
														? "text-orange-500"
														: "text-green-500",
											)}
										>
											{product.stock}
										</span>
									</td>
									<td className="p-4">
										<span
											className={clsx(
												"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
												getStatusBadge(product.status),
											)}
										>
											{getStatusIcon(product.status)}
											{product.status
												.replace(/_/g, " ")
												.replace(/\b\w/g, (letter) => letter.toUpperCase())}
										</span>
									</td>
									<td className="p-4 text-sm">{product.sales}</td>
									<td className="p-4">
										<div className="flex items-center gap-1">
											<Star
												size={14}
												className="text-yellow-500 fill-yellow-500"
											/>
											<span className="text-sm">{product.rating || "-"}</span>
										</div>
									</td>
									<td className="p-4">
										<div className="flex items-center gap-1">
											<button
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="View"
											>
												<Eye size={16} />
											</button>
											<button
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="Edit"
											>
												<Edit size={16} />
											</button>
											<button
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="Duplicate"
											>
												<Copy size={16} />
											</button>
											<button
												onClick={() => {
													setProductToDelete(product.id)
													setShowDeleteModal(true)
												}}
												className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition"
												title="Delete"
											>
												<Trash2 size={16} />
											</button>
										</div>
									</td>
								</motion.tr>
							))}
						</tbody>
					</table>
				</div>

				{filteredProducts.length === 0 && (
					<div className="text-center py-16">
						<Package className="mx-auto mb-4 text-gray-400" size={48} />
						<h3 className="text-lg font-semibold mb-2">No products found</h3>
						<p className="text-gray-500">
							Try adjusting your search or filters
						</p>
					</div>
				)}

				<div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
					<p className="text-sm text-gray-500">
						Showing {filteredProducts.length} of {mockProducts.length} products
					</p>
					<div className="flex gap-2">
						{[1, 2, 3, "...", 8].map((page, index) => (
							<button
								key={index}
								className={clsx(
									"w-8 h-8 rounded-lg text-sm transition",
									page === 1
										? "bg-primary text-white"
										: "hover:bg-gray-200 dark:hover:bg-gray-700",
								)}
							>
								{page}
							</button>
						))}
					</div>
				</div>
			</div>

			<AnimatePresence>
				{showDeleteModal && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/50 z-50"
							onClick={() => setShowDeleteModal(false)}
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
						>
							<div className="glass-card p-6 text-center">
								<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
									<Trash2 className="text-red-500" size={32} />
								</div>
								<h3 className="text-xl font-bold mb-2">Delete Product?</h3>
								<p className="text-gray-500 mb-6">
									This action cannot be undone. The product will be permanently
									removed from your catalog.
								</p>
								<div className="flex gap-3 justify-center">
									<button
										onClick={() => setShowDeleteModal(false)}
										className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
									>
										Cancel
									</button>
									<button
										onClick={() => {
											setShowDeleteModal(false)
											setProductToDelete(null)
										}}
										className="px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
									>
										Delete
									</button>
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	)
}
