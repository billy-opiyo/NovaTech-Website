"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
	Package,
	Search,
	Filter,
	Eye,
	Edit,
	Trash2,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	Plus,
	Download,
	Warehouse,
	ShoppingCart,
	TrendingUp,
	TrendingDown,
} from "lucide-react"
import clsx from "clsx"

interface InventoryItem {
	id: string
	name: string
	category: string
	brand: string
	sku: string
	stock: number
	minStock: number
	maxStock: number
	price: number
	image: string
	status: "in_stock" | "low_stock" | "out_of_stock" | "overstocked"
	lastRestocked: string
	totalSold: number
}

const mockInventory: InventoryItem[] = [
	{
		id: "inv-1",
		name: "iPhone 15 Pro Max",
		category: "Phones",
		brand: "Apple",
		sku: "IPH-15-PM-256",
		stock: 25,
		minStock: 10,
		maxStock: 100,
		price: 159999,
		image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=100&q=80",
		status: "in_stock",
		lastRestocked: "2024-08-20",
		totalSold: 145,
	},
	{
		id: "inv-2",
		name: "MacBook Air M3",
		category: "Laptops",
		brand: "Apple",
		sku: "MBA-M3-256",
		stock: 5,
		minStock: 10,
		maxStock: 50,
		price: 189999,
		image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=100&q=80",
		status: "low_stock",
		lastRestocked: "2024-08-15",
		totalSold: 89,
	},
	{
		id: "inv-3",
		name: "Samsung Galaxy S24 Ultra",
		category: "Phones",
		brand: "Samsung",
		sku: "SAM-S24U-256",
		stock: 0,
		minStock: 15,
		maxStock: 80,
		price: 134999,
		image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=100&q=80",
		status: "out_of_stock",
		lastRestocked: "2024-08-10",
		totalSold: 112,
	},
	{
		id: "inv-4",
		name: "Sony WH-1000XM5",
		category: "Accessories",
		brand: "Sony",
		sku: "SNY-WH1000XM5",
		stock: 150,
		minStock: 20,
		maxStock: 100,
		price: 34999,
		image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=100&q=80",
		status: "overstocked",
		lastRestocked: "2024-08-18",
		totalSold: 67,
	},
	{
		id: "inv-5",
		name: "Dell XPS 15",
		category: "Laptops",
		brand: "Dell",
		sku: "DEL-XPS15-512",
		stock: 12,
		minStock: 8,
		maxStock: 40,
		price: 159999,
		image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=100&q=80",
		status: "in_stock",
		lastRestocked: "2024-08-22",
		totalSold: 34,
	},
]

const statusFilters = ["All", "In Stock", "Low Stock", "Out of Stock", "Overstocked"]

export default function AdminInventoryPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const filteredInventory = mockInventory.filter((item) => {
		const matchesSearch =
			item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.brand.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" ||
			item.status.toLowerCase().replace("_", " ") === statusFilter.toLowerCase()
		return matchesSearch && matchesStatus
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			in_stock: "bg-green-500/20 text-green-600",
			low_stock: "bg-yellow-500/20 text-yellow-600",
			out_of_stock: "bg-red-500/20 text-red-600",
			overstocked: "bg-blue-500/20 text-blue-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			in_stock: <CheckCircle2 size={14} />,
			low_stock: <AlertTriangle size={14} />,
			out_of_stock: <XCircle size={14} />,
			overstocked: <TrendingUp size={14} />,
		}
		return icons[status] || null
	}

	const inventoryStats = {
		total: mockInventory.length,
		inStock: mockInventory.filter((i) => i.status === "in_stock").length,
		lowStock: mockInventory.filter((i) => i.status === "low_stock").length,
		outOfStock: mockInventory.filter((i) => i.status === "out_of_stock").length,
		overstocked: mockInventory.filter((i) => i.status === "overstocked").length,
		totalValue: mockInventory.reduce((sum, i) => sum + i.price * i.stock, 0),
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Inventory</h1>
					<p className="text-gray-500 mt-1">Manage stock levels and inventory</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export
					</button>
					<button className="btn-primary flex items-center gap-2">
						<Plus size={18} /> Add Product
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{
						label: "Total Products",
						value: inventoryStats.total.toString(),
						icon: Package,
						color: "text-blue-500",
					},
					{
						label: "In Stock",
						value: inventoryStats.inStock.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "Low Stock",
						value: inventoryStats.lowStock.toString(),
						icon: AlertTriangle,
						color: "text-yellow-500",
					},
					{
						label: "Out of Stock",
						value: inventoryStats.outOfStock.toString(),
						icon: XCircle,
						color: "text-red-500",
					},
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

			{/* Filters */}
			<div className="glass-card p-4 mb-6">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="relative flex-1">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							placeholder="Search by product name, SKU, or brand..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
					<div className="flex gap-2">
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
				</div>
			</div>

			{/* Inventory Table */}
			<div className="glass-card overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Product
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									SKU
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Category
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Stock
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Min/Max
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Value
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Status
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredInventory.map((item, index) => (
								<motion.tr
									key={item.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.03 }}
									className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition"
								>
									<td className="p-4">
										<div className="flex items-center gap-3">
											<div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
												<Image
													src={item.image}
													alt={item.name}
													fill
													className="object-cover"
												/>
											</div>
											<div>
												<p className="font-medium text-sm">{item.name}</p>
												<p className="text-xs text-gray-500">{item.brand}</p>
											</div>
										</div>
									</td>
									<td className="p-4">
										<span className="font-mono text-xs">{item.sku}</span>
									</td>
									<td className="p-4 text-sm">{item.category}</td>
									<td className="p-4">
										<span className="text-sm font-medium">{item.stock}</span>
									</td>
									<td className="p-4 text-xs text-gray-500">
										{item.minStock} / {item.maxStock}
									</td>
									<td className="p-4 text-sm font-medium">
										KES {(item.price * item.stock).toLocaleString()}
									</td>
									<td className="p-4">
										<span
											className={clsx(
												"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
												getStatusBadge(item.status),
											)}
										>
											{getStatusIcon(item.status)}
											{item.status.replace("_", " ").toUpperCase()}
										</span>
									</td>
									<td className="p-4">
										<div className="flex items-center gap-1">
											<button
												onClick={() => {
													setSelectedItem(item)
													setShowDetails(true)
												}}
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="View Details"
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

				{filteredInventory.length === 0 && (
					<div className="text-center py-16">
						<Warehouse className="mx-auto mb-4 text-gray-400" size={48} />
						<h3 className="text-lg font-semibold mb-2">No inventory items found</h3>
						<p className="text-gray-500">Try adjusting your search or filters</p>
					</div>
				)}

				<div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
					<p className="text-sm text-gray-500">
						Showing {filteredInventory.length} of {mockInventory.length} items
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

			{/* Inventory Details Modal */}
			<AnimatePresence>
				{showDetails && selectedItem && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/50 z-50"
							onClick={() => setShowDetails(false)}
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto"
						>
							<div className="glass-card p-6">
								<div className="flex items-center justify-between mb-6">
									<h2 className="text-xl font-bold">Inventory Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Product Info */}
									<div className="flex items-center gap-4">
										<div className="relative h-24 w-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
											<Image
												src={selectedItem.image}
												alt={selectedItem.name}
												fill
												className="object-cover"
											/>
										</div>
										<div>
											<h3 className="font-semibold text-lg">{selectedItem.name}</h3>
											<p className="text-sm text-gray-500">{selectedItem.brand}</p>
											<p className="text-xs text-gray-400 font-mono mt-1">{selectedItem.sku}</p>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Stock Info */}
									<div>
										<h3 className="font-semibold mb-3">Stock Information</h3>
										<div className="grid grid-cols-2 gap-4">
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-2xl font-bold text-primary">{selectedItem.stock}</p>
												<p className="text-sm text-gray-500">Current Stock</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-2xl font-bold text-orange-600">
													{selectedItem.minStock}
												</p>
												<p className="text-sm text-gray-500">Min Stock Level</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-2xl font-bold text-green-600">
													KES {selectedItem.price.toLocaleString()}
												</p>
												<p className="text-sm text-gray-500">Unit Price</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-2xl font-bold text-purple-600">
													KES {(selectedItem.price * selectedItem.stock).toLocaleString()}
												</p>
												<p className="text-sm text-gray-500">Total Value</p>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Stats */}
									<div>
										<h3 className="font-semibold mb-3">Performance</h3>
										<div className="grid grid-cols-2 gap-4">
											<div className="flex items-center gap-2">
												<ShoppingCart size={20} className="text-gray-400" />
												<div>
													<p className="text-xl font-bold">{selectedItem.totalSold}</p>
													<p className="text-xs text-gray-500">Total Sold</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Warehouse size={20} className="text-gray-400" />
												<div>
													<p className="text-sm font-medium">{selectedItem.lastRestocked}</p>
													<p className="text-xs text-gray-500">Last Restocked</p>
												</div>
											</div>
										</div>
									</div>

									{/* Actions */}
									<div className="flex gap-3">
										<button className="btn-primary flex-1">Update Stock</button>
										<button className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition">
											Restock
										</button>
										<button
											onClick={() => setShowDetails(false)}
											className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
										>
											Close
										</button>
									</div>
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	)
}