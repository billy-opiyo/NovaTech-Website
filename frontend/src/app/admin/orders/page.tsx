"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Search,
	Eye,
	Truck,
	Package,
	Clock,
	CheckCircle2,
	XCircle,
	Download,
	MapPin,
	Phone,
	Mail,
	Calendar,
} from "lucide-react"
import clsx from "clsx"

interface AdminOrder {
	id: string
	customer: string
	email: string
	phone: string
	items: number
	total: number
	status:
		| "pending"
		| "confirmed"
		| "processing"
		| "shipped"
		| "delivered"
		| "cancelled"
	paymentMethod: string
	date: string
	location: string
}

const mockOrders: AdminOrder[] = [
	{
		id: "EB-20240820-001",
		customer: "John Doe",
		email: "john@example.com",
		phone: "0712345678",
		items: 2,
		total: 174999,
		status: "delivered",
		paymentMethod: "M-Pesa",
		date: "2024-08-20",
		location: "Nairobi",
	},
	{
		id: "EB-20240821-002",
		customer: "Sarah K.",
		email: "sarah@example.com",
		phone: "0723456789",
		items: 1,
		total: 34999,
		status: "processing",
		paymentMethod: "Cash on Delivery",
		date: "2024-08-21",
		location: "Mombasa",
	},
	{
		id: "EB-20240822-003",
		customer: "Mike O.",
		email: "mike@example.com",
		phone: "0734567890",
		items: 3,
		total: 89999,
		status: "shipped",
		paymentMethod: "M-Pesa",
		date: "2024-08-22",
		location: "Kisumu",
	},
	{
		id: "EB-20240823-004",
		customer: "Jane M.",
		email: "jane@example.com",
		phone: "0745678901",
		items: 1,
		total: 54999,
		status: "pending",
		paymentMethod: "Cash on Delivery",
		date: "2024-08-23",
		location: "Nakuru",
	},
	{
		id: "EB-20240824-005",
		customer: "Brian K.",
		email: "brian@example.com",
		phone: "0756789012",
		items: 4,
		total: 224999,
		status: "confirmed",
		paymentMethod: "M-Pesa",
		date: "2024-08-24",
		location: "Nairobi",
	},
	{
		id: "EB-20240819-006",
		customer: "Alice W.",
		email: "alice@example.com",
		phone: "0767890123",
		items: 1,
		total: 12999,
		status: "cancelled",
		paymentMethod: "M-Pesa",
		date: "2024-08-19",
		location: "Eldoret",
	},
]

const statusFilters = [
	"All",
	"Pending",
	"Confirmed",
	"Processing",
	"Shipped",
	"Delivered",
	"Cancelled",
]

export default function AdminOrdersPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const filteredOrders = mockOrders.filter((order) => {
		const matchesSearch =
			order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
			order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
			order.email.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" || order.status === statusFilter.toLowerCase()
		return matchesSearch && matchesStatus
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			pending: "bg-yellow-500/20 text-yellow-600",
			confirmed: "bg-blue-500/20 text-blue-600",
			processing: "bg-orange-500/20 text-orange-600",
			shipped: "bg-purple-500/20 text-purple-600",
			delivered: "bg-green-500/20 text-green-600",
			cancelled: "bg-red-500/20 text-red-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			pending: <Clock size={14} />,
			confirmed: <CheckCircle2 size={14} />,
			processing: <Package size={14} />,
			shipped: <Truck size={14} />,
			delivered: <CheckCircle2 size={14} />,
			cancelled: <XCircle size={14} />,
		}
		return icons[status] || null
	}

	const updateOrderStatus = (orderId: string, newStatus: string) => {
		console.log(`Update order ${orderId} to ${newStatus}`)
	}

	return (
		<div>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Orders</h1>
					<p className="text-gray-500 mt-1">Manage customer orders</p>
				</div>
				<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
					<Download size={18} /> Export Orders
				</button>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
				{[
					{ label: "All", count: 1245, color: "bg-gray-500" },
					{ label: "Pending", count: 23, color: "bg-yellow-500" },
					{ label: "Confirmed", count: 45, color: "bg-blue-500" },
					{ label: "Processing", count: 67, color: "bg-orange-500" },
					{ label: "Shipped", count: 89, color: "bg-purple-500" },
					{ label: "Delivered", count: 980, color: "bg-green-500" },
					{ label: "Cancelled", count: 41, color: "bg-red-500" },
				].map((stat, index) => (
					<motion.button
						key={stat.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05 }}
						onClick={() =>
							setStatusFilter(stat.label === "All" ? "All" : stat.label)
						}
						className={clsx(
							"glass-card p-3 text-center transition hover:scale-105",
							statusFilter === stat.label && "ring-2 ring-primary",
						)}
					>
						<p className="text-2xl font-bold">{stat.count}</p>
						<p className="text-xs text-gray-500 mt-1">{stat.label}</p>
					</motion.button>
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
							placeholder="Search by order ID, customer, or email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
				</div>
			</div>

			<div className="glass-card overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Order ID
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Customer
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Items
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Total
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Status
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Payment
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Date
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredOrders.map((order, index) => (
								<motion.tr
									key={order.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.03 }}
									className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition"
								>
									<td className="p-4">
										<span className="font-mono text-sm font-medium">
											{order.id}
										</span>
									</td>
									<td className="p-4">
										<div>
											<p className="font-medium text-sm">{order.customer}</p>
											<p className="text-xs text-gray-500">{order.location}</p>
										</div>
									</td>
									<td className="p-4 text-sm">{order.items}</td>
									<td className="p-4 text-sm font-medium">
										KES {order.total.toLocaleString()}
									</td>
									<td className="p-4">
										<select
											value={order.status}
											onChange={(e) =>
												updateOrderStatus(order.id, e.target.value)
											}
											className={clsx(
												"px-2 py-1 rounded-full text-xs font-medium border-0 outline-none cursor-pointer",
												getStatusBadge(order.status),
											)}
										>
											<option value="pending">Pending</option>
											<option value="confirmed">Confirmed</option>
											<option value="processing">Processing</option>
											<option value="shipped">Shipped</option>
											<option value="delivered">Delivered</option>
											<option value="cancelled">Cancelled</option>
										</select>
									</td>
									<td className="p-4 text-sm">{order.paymentMethod}</td>
									<td className="p-4 text-sm text-gray-500">{order.date}</td>
									<td className="p-4">
										<button
											onClick={() => {
												setSelectedOrder(order)
												setShowDetails(true)
											}}
											className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
											title="View Details"
										>
											<Eye size={16} />
										</button>
									</td>
								</motion.tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<AnimatePresence>
				{showDetails && selectedOrder && (
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
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto"
						>
							<div className="glass-card p-6">
								<div className="flex items-center justify-between mb-6">
									<h2 className="text-xl font-bold">Order Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-4">
									<div className="flex justify-between">
										<span className="text-gray-500">Order ID</span>
										<span className="font-mono font-medium">
											{selectedOrder.id}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500">Date</span>
										<span className="flex items-center gap-1">
											<Calendar size={14} /> {selectedOrder.date}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500">Status</span>
										<span
											className={clsx(
												"px-2 py-1 rounded-full text-xs font-medium",
												getStatusBadge(selectedOrder.status),
											)}
										>
											{selectedOrder.status.toUpperCase()}
										</span>
									</div>
									<hr className="border-gray-200 dark:border-gray-700" />
									<h3 className="font-semibold">Customer</h3>
									<div className="flex justify-between">
										<span className="text-gray-500">Name</span>
										<span>{selectedOrder.customer}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500 flex items-center gap-1">
											<Mail size={14} /> Email
										</span>
										<span>{selectedOrder.email}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500 flex items-center gap-1">
											<Phone size={14} /> Phone
										</span>
										<span>{selectedOrder.phone}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500 flex items-center gap-1">
											<MapPin size={14} /> Location
										</span>
										<span>{selectedOrder.location}</span>
									</div>
									<hr className="border-gray-200 dark:border-gray-700" />
									<div className="flex justify-between">
										<span className="text-gray-500">Items</span>
										<span>{selectedOrder.items}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-500">Payment</span>
										<span>{selectedOrder.paymentMethod}</span>
									</div>
									<div className="flex justify-between text-lg font-bold pt-4 border-t border-gray-200 dark:border-gray-700">
										<span>Total</span>
										<span>KES {selectedOrder.total.toLocaleString()}</span>
									</div>
								</div>

								<div className="flex gap-3 mt-6">
									<button className="btn-primary flex-1">Print Invoice</button>
									<button
										onClick={() => setShowDetails(false)}
										className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
									>
										Close
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
