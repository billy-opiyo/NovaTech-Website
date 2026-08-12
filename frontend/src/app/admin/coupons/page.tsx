"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import {
	Plus,
	Search,
	Edit,
	Trash2,
	Ticket,
	Calendar,
	Percent,
	Users,
	ShoppingCart,
	Eye,
	Copy,
	CheckCircle2,
	XCircle,
	Download,
	Filter,
} from "lucide-react"
import clsx from "clsx"

interface Coupon {
	id: string
	code: string
	description: string
	type: "percentage" | "fixed"
	value: number
	minOrder: number
	maxDiscount?: number
	usageLimit: number
	usedCount: number
	validFrom: string
	validUntil: string
	status: "active" | "inactive" | "expired"
	category?: string
}

const mockCoupons: Coupon[] = [
	{
		id: "coup-1",
		code: "TECH10",
		description: "10% off on all electronics",
		type: "percentage",
		value: 10,
		minOrder: 5000,
		maxDiscount: 10000,
		usageLimit: 1000,
		usedCount: 456,
		validFrom: "2024-01-01",
		validUntil: "2024-12-31",
		status: "active",
		category: "All Products",
	},
	{
		id: "coup-2",
		code: "SAVE500",
		description: "KES 500 off on orders above KES 10,000",
		type: "fixed",
		value: 500,
		minOrder: 10000,
		usageLimit: 500,
		usedCount: 234,
		validFrom: "2024-06-01",
		validUntil: "2024-09-30",
		status: "active",
		category: "All Products",
	},
	{
		id: "coup-3",
		code: "LAPTOP20",
		description: "20% off on all laptops",
		type: "percentage",
		value: 20,
		minOrder: 50000,
		maxDiscount: 25000,
		usageLimit: 200,
		usedCount: 89,
		validFrom: "2024-08-01",
		validUntil: "2024-08-31",
		status: "active",
		category: "Laptops",
	},
	{
		id: "coup-4",
		code: "WELCOME100",
		description: "KES 100 off for first-time customers",
		type: "fixed",
		value: 100,
		minOrder: 2000,
		usageLimit: 5000,
		usedCount: 3456,
		validFrom: "2024-01-01",
		validUntil: "2024-12-31",
		status: "active",
		category: "All Products",
	},
	{
		id: "coup-5",
		code: "SUMMER25",
		description: "25% off on summer sale items",
		type: "percentage",
		value: 25,
		minOrder: 15000,
		maxDiscount: 30000,
		usageLimit: 300,
		usedCount: 300,
		validFrom: "2024-06-01",
		validUntil: "2024-07-31",
		status: "expired",
		category: "Sale Items",
	},
]

const statusFilters = ["All", "Active", "Inactive", "Expired"]

export default function AdminCouponsPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const filteredCoupons = mockCoupons.filter((coupon) => {
		const matchesSearch =
			coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
			coupon.description.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" ||
			coupon.status.toLowerCase() === statusFilter.toLowerCase()
		return matchesSearch && matchesStatus
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			active: "bg-green-500/20 text-green-600",
			inactive: "bg-gray-500/20 text-gray-600",
			expired: "bg-red-500/20 text-red-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			active: <CheckCircle2 size={14} />,
			inactive: <XCircle size={14} />,
			expired: <Calendar size={14} />,
		}
		return icons[status] || null
	}

	const couponStats = {
		total: mockCoupons.length,
		active: mockCoupons.filter((c) => c.status === "active").length,
		inactive: mockCoupons.filter((c) => c.status === "inactive").length,
		expired: mockCoupons.filter((c) => c.status === "expired").length,
		totalUsage: mockCoupons.reduce((sum, c) => sum + c.usedCount, 0),
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Coupons</h1>
					<p className="text-gray-500 mt-1">Manage discount codes and promotions</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export
					</button>
					<button className="btn-primary flex items-center gap-2">
						<Plus size={18} /> Create Coupon
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{
						label: "Total Coupons",
						value: couponStats.total.toString(),
						icon: Ticket,
						color: "text-blue-500",
					},
					{
						label: "Active",
						value: couponStats.active.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "Inactive",
						value: couponStats.inactive.toString(),
						icon: XCircle,
						color: "text-gray-500",
					},
					{
						label: "Total Usage",
						value: couponStats.totalUsage.toLocaleString(),
						icon: ShoppingCart,
						color: "text-purple-500",
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
							placeholder="Search coupons by code or description..."
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

			{/* Coupons Table */}
			<div className="glass-card overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Coupon Code
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Description
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Type
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Value
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Usage
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Validity
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
							{filteredCoupons.map((coupon, index) => (
								<motion.tr
									key={coupon.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.03 }}
									className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition"
								>
									<td className="p-4">
										<div className="flex items-center gap-2">
											<Ticket className="text-primary" size={18} />
											<span className="font-mono font-semibold text-sm">
												{coupon.code}
											</span>
										</div>
									</td>
									<td className="p-4">
										<p className="text-sm">{coupon.description}</p>
										{coupon.category && (
											<p className="text-xs text-gray-500 mt-1">{coupon.category}</p>
										)}
									</td>
									<td className="p-4">
										<div className="flex items-center gap-1 text-sm">
											{coupon.type === "percentage" ? (
												<>
															<Percent size={14} className="text-gray-400" />
													<span>Percentage</span>
												</>
											) : (
												<>
													<span className="text-gray-400">KES</span>
													<span>Fixed</span>
												</>
											)}
										</div>
									</td>
									<td className="p-4">
										<span className="text-sm font-medium">
											{coupon.type === "percentage" ? `${coupon.value}%` : `KES ${coupon.value}`}
										</span>
										{coupon.maxDiscount && coupon.type === "percentage" && (
											<p className="text-xs text-gray-500">
												Max: KES {coupon.maxDiscount.toLocaleString()}
											</p>
										)}
									</td>
									<td className="p-4">
										<div className="text-sm">
											<p className="font-medium">{coupon.usedCount} / {coupon.usageLimit}</p>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
												<motion.div
													initial={{ width: 0 }}
													animate={{ width: `${(coupon.usedCount / coupon.usageLimit) * 100}%` }}
													className={clsx(
														"h-1.5 rounded-full",
														coupon.usedCount / coupon.usageLimit > 0.9
															? "bg-red-500"
															: "bg-green-500"
													)}
												/>
											</div>
										</div>
									</td>
									<td className="p-4">
										<div className="text-xs">
											<p>From: {coupon.validFrom}</p>
											<p className="text-gray-500">Until: {coupon.validUntil}</p>
										</div>
									</td>
									<td className="p-4">
										<span
											className={clsx(
												"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
												getStatusBadge(coupon.status),
											)}
										>
											{getStatusIcon(coupon.status)}
											{coupon.status.toUpperCase()}
										</span>
									</td>
									<td className="p-4">
										<div className="flex items-center gap-1">
											<button
												onClick={() => {
													setSelectedCoupon(coupon)
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
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="Copy"
											>
												<Copy size={16} />
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

				{filteredCoupons.length === 0 && (
					<div className="text-center py-16">
						<Ticket className="mx-auto mb-4 text-gray-400" size={48} />
						<h3 className="text-lg font-semibold mb-2">No coupons found</h3>
						<p className="text-gray-500">Try adjusting your search or filters</p>
					</div>
				)}

				<div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
					<p className="text-sm text-gray-500">
						Showing {filteredCoupons.length} of {mockCoupons.length} coupons
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

			{/* Coupon Details Modal */}
			<AnimatePresence>
				{showDetails && selectedCoupon && (
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
									<h2 className="text-xl font-bold">Coupon Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Coupon Code Display */}
									<div className="flex items-center justify-center p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border-2 border-dashed border-primary">
										<div className="text-center">
											<Ticket className="mx-auto mb-2 text-primary" size={32} />
											<p className="text-2xl font-bold font-mono">{selectedCoupon.code}</p>
											<p className="text-sm text-gray-500 mt-1">{selectedCoupon.description}</p>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Coupon Info */}
									<div>
										<h3 className="font-semibold mb-3">Coupon Information</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="flex items-center gap-2">
														<Percent size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Discount Type</p>
													<p className="text-sm font-medium">
														{selectedCoupon.type === "percentage" ? "Percentage" : "Fixed Amount"}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<ShoppingCart size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Discount Value</p>
													<p className="text-sm font-medium">
														{selectedCoupon.type === "percentage" 
															? `${selectedCoupon.value}%` 
															: `KES ${selectedCoupon.value}`}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Users size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Min. Order</p>
													<p className="text-sm font-medium">KES {selectedCoupon.minOrder.toLocaleString()}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Calendar size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Validity</p>
													<p className="text-sm font-medium">
														{selectedCoupon.validFrom} to {selectedCoupon.validUntil}
													</p>
												</div>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Usage Stats */}
									<div>
										<h3 className="font-semibold mb-3">Usage Statistics</h3>
										<div className="grid grid-cols-2 gap-4">
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-2xl font-bold text-primary">
													{selectedCoupon.usedCount}
												</p>
												<p className="text-sm text-gray-500">Times Used</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-2xl font-bold text-green-600">
													{selectedCoupon.usageLimit - selectedCoupon.usedCount}
												</p>
												<p className="text-sm text-gray-500">Remaining</p>
											</div>
										</div>
										<div className="mt-4">
											<div className="flex items-center justify-between mb-2">
												<span className="text-sm text-gray-500">Usage Progress</span>
												<span className="text-sm font-medium">
													{((selectedCoupon.usedCount / selectedCoupon.usageLimit) * 100).toFixed(1)}%
												</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
												<motion.div
													initial={{ width: 0 }}
													animate={{ width: `${(selectedCoupon.usedCount / selectedCoupon.usageLimit) * 100}%` }}
													className={clsx(
														"h-2 rounded-full",
														selectedCoupon.usedCount / selectedCoupon.usageLimit > 0.9
															? "bg-red-500"
															: "bg-green-500"
													)}
												/>
											</div>
										</div>
									</div>

									{/* Actions */}
									<div className="flex gap-3">
										<button className="btn-primary flex-1">Edit Coupon</button>
										<button
											onClick={() => setShowDetails(false)}
											className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
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
