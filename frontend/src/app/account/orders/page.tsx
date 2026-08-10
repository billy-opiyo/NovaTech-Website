"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
	Package,
	Search,
	ChevronRight,
	Clock,
	CheckCircle2,
	Truck,
	Calendar,
	Eye,
} from "lucide-react"
import clsx from "clsx"

interface Order {
	id: string
	date: string
	status:
		| "pending"
		| "confirmed"
		| "processing"
		| "shipped"
		| "out_for_delivery"
		| "delivered"
		| "cancelled"
	total: number
	items: number
	trackingNumber?: string
	estimatedDelivery?: string
}

const mockOrders: Order[] = [
	{
		id: "EB-20240815-001",
		date: "2024-08-15",
		status: "delivered",
		total: 174999,
		items: 2,
		trackingNumber: "KN-TRK-12345",
		estimatedDelivery: "2024-08-18",
	},
	{
		id: "EB-20240820-002",
		date: "2024-08-20",
		status: "processing",
		total: 34999,
		items: 1,
		estimatedDelivery: "2024-08-25",
	},
	{
		id: "EB-20240825-003",
		date: "2024-08-25",
		status: "shipped",
		total: 89999,
		items: 3,
		trackingNumber: "KN-TRK-67890",
		estimatedDelivery: "2024-08-30",
	},
	{
		id: "EB-20240826-004",
		date: "2024-08-26",
		status: "out_for_delivery",
		total: 54999,
		items: 1,
		trackingNumber: "KN-TRK-24680",
		estimatedDelivery: "2024-08-28",
	},
	{
		id: "EB-20240810-005",
		date: "2024-08-10",
		status: "delivered",
		total: 124999,
		items: 2,
		trackingNumber: "KN-TRK-13579",
		estimatedDelivery: "2024-08-13",
	},
]

const statusSteps = [
	{ key: "pending", label: "Order Placed", icon: Package },
	{ key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
	{ key: "processing", label: "Processing", icon: Clock },
	{ key: "shipped", label: "Shipped", icon: Truck },
	{ key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
	{ key: "delivered", label: "Delivered", icon: CheckCircle2 },
]

const filters = [
	"All",
	"Pending",
	"Processing",
	"Shipped",
	"Delivered",
	"Cancelled",
]

export default function OrdersPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [activeFilter, setActiveFilter] = useState("All")
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
	const [showTracking, setShowTracking] = useState(false)

	const filteredOrders = mockOrders.filter((order) => {
		const matchesSearch = order.id
			.toLowerCase()
			.includes(searchQuery.toLowerCase())
		const matchesFilter =
			activeFilter === "All" ||
			order.status === activeFilter.toLowerCase().replace(" ", "_")
		return matchesSearch && matchesFilter
	})

	const getStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			pending: "bg-yellow-500/20 text-yellow-600",
			confirmed: "bg-blue-500/20 text-blue-600",
			processing: "bg-orange-500/20 text-orange-600",
			shipped: "bg-purple-500/20 text-purple-600",
			out_for_delivery: "bg-indigo-500/20 text-indigo-600",
			delivered: "bg-green-500/20 text-green-600",
			cancelled: "bg-red-500/20 text-red-600",
		}
		return colors[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIndex = (status: string) =>
		statusSteps.findIndex((s) => s.key === status)

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold">My Orders</h1>
					<p className="text-gray-500 mt-1">Track and manage your orders</p>
				</div>
			</div>

			<div className="glass-card p-4 mb-8">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="relative flex-1">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							placeholder="Search by order ID..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
					<div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
						{filters.map((filter) => (
							<button
								key={filter}
								onClick={() => setActiveFilter(filter)}
								className={clsx(
									"px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
									activeFilter === filter
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

			<div className="space-y-4">
				<AnimatePresence>
					{filteredOrders.map((order, i) => (
						<motion.div
							key={order.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ delay: i * 0.05 }}
							className="glass-card p-6"
						>
							<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
								<div className="flex items-start gap-4">
									<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
										<Package className="text-primary" size={24} />
									</div>
									<div>
										<Link
											href={`/account/orders/${order.id}`}
											className="font-semibold text-lg hover:text-primary transition"
										>
											Order #{order.id}
										</Link>
										<div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
											<span className="flex items-center gap-1">
												<Calendar size={14} /> {order.date}
											</span>
											<span>{order.items} items</span>
											{order.trackingNumber && (
												<span className="flex items-center gap-1">
													<Truck size={14} /> {order.trackingNumber}
												</span>
											)}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-4">
									<span
										className={clsx(
											"px-3 py-1 rounded-full text-xs font-medium",
											getStatusColor(order.status),
										)}
									>
										{order.status
											.replace(/_/g, " ")
											.replace(/\b\w/g, (l) => l.toUpperCase())}
									</span>
									<p className="font-bold text-lg">
										KES {order.total.toLocaleString()}
									</p>
									<div className="flex gap-2">
										<button
											onClick={() => {
												setSelectedOrder(order)
												setShowTracking(true)
											}}
											className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
											title="Track Order"
										>
											<Eye size={18} />
										</button>
										<Link
											href={`/account/orders/${order.id}`}
											className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
										>
											<ChevronRight size={18} />
										</Link>
									</div>
								</div>
							</div>

							<div className="mt-6 flex items-center gap-0">
								{statusSteps.slice(0, 4).map((step, idx) => {
									const currentIdx = getStatusIndex(order.status)
									const isCompleted =
										idx <= currentIdx && order.status !== "cancelled"
									const isCurrent = idx === currentIdx
									return (
										<div key={step.key} className="flex-1 flex items-center">
											<div className="flex flex-col items-center">
												<div
													className={clsx(
														"w-8 h-8 rounded-full flex items-center justify-center transition",
														isCompleted
															? "bg-primary text-white"
															: "bg-gray-200 dark:bg-gray-700 text-gray-400",
														isCurrent && "ring-4 ring-primary/20",
													)}
												>
													<step.icon size={14} />
												</div>
												<span className="text-xs mt-2 text-center hidden md:block">
													{step.label}
												</span>
											</div>
											{idx < 3 && (
												<div
													className={clsx(
														"flex-1 h-1 mx-2 rounded-full transition",
														idx < currentIdx
															? "bg-primary"
															: "bg-gray-200 dark:bg-gray-700",
													)}
												/>
											)}
										</div>
									)
								})}
							</div>
						</motion.div>
					))}
				</AnimatePresence>

				{filteredOrders.length === 0 && (
					<div className="text-center py-16 glass-card">
						<Package className="mx-auto mb-4 text-gray-400" size={48} />
						<h3 className="text-lg font-semibold mb-2">No orders found</h3>
						<p className="text-gray-500">
							Try adjusting your search or filters
						</p>
					</div>
				)}
			</div>

			<AnimatePresence>
				{showTracking && selectedOrder && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/50 z-50"
							onClick={() => setShowTracking(false)}
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] max-h-[90vh] overflow-y-auto z-50 glass-card p-6 md:p-8"
						>
							<h2 className="text-xl font-bold mb-6">
								Track Order #{selectedOrder.id}
							</h2>

							<div className="space-y-0">
								{statusSteps.map((step, idx) => {
									const currentIdx = getStatusIndex(selectedOrder.status)
									const isCompleted =
										idx <= currentIdx && selectedOrder.status !== "cancelled"
									const isCurrent = idx === currentIdx
									return (
										<div key={step.key} className="flex gap-4">
											<div className="flex flex-col items-center">
												<div
													className={clsx(
														"w-10 h-10 rounded-full flex items-center justify-center transition",
														isCompleted
															? "bg-primary text-white"
															: "bg-gray-200 dark:bg-gray-700 text-gray-400",
														isCurrent && "ring-4 ring-primary/20",
													)}
												>
													<step.icon size={18} />
												</div>
												{idx < statusSteps.length - 1 && (
													<div
														className={clsx(
															"w-0.5 flex-1 min-h-[30px] transition",
															idx < currentIdx
																? "bg-primary"
																: "bg-gray-200 dark:bg-gray-700",
														)}
													/>
												)}
											</div>
											<div className="pb-8">
												<p
													className={clsx(
														"font-semibold",
														isCompleted ? "text-primary" : "text-gray-400",
													)}
												>
													{step.label}
												</p>
												{isCurrent && (
													<p className="text-sm text-gray-500 mt-1">
														{selectedOrder.status === "out_for_delivery"
															? "Your package is on its way!"
															: selectedOrder.status === "shipped"
																? "Package has left our warehouse"
																: selectedOrder.status === "processing"
																	? "We are preparing your order"
																	: "Order has been received"}
													</p>
												)}
											</div>
										</div>
									)
								})}
							</div>

							<div className="mt-6 p-4 rounded-xl bg-black/5 dark:bg-white/5 space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-gray-500">Tracking Number</span>
									<span className="font-medium">
										{selectedOrder.trackingNumber || "N/A"}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-500">Estimated Delivery</span>
									<span className="font-medium">
										{selectedOrder.estimatedDelivery || "TBD"}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-500">Total</span>
									<span className="font-bold">
										KES {selectedOrder.total.toLocaleString()}
									</span>
								</div>
							</div>

							<button
								onClick={() => setShowTracking(false)}
								className="btn-primary w-full mt-6"
							>
								Close
							</button>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	)
}
