"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import {
	Truck,
	Search,
	Filter,
	Eye,
	MapPin,
	Phone,
	Package,
	Clock,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Download,
	Users,
	DollarSign,
} from "lucide-react"
import clsx from "clsx"

interface Delivery {
	id: string
	orderId: string
	customerName: string
	customerPhone: string
	deliveryAddress: string
	county: string
	courierService: string
	trackingNumber: string
	estimatedDelivery: string
	actualDelivery?: string
	status: "pending" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "failed"
	items: number
	totalWeight: string
	deliveryFee: number
	notes?: string
}

const mockDeliveries: Delivery[] = [
	{
		id: "del-1",
		orderId: "EB-20240824-005",
		customerName: "John Doe",
		customerPhone: "0712345678",
		deliveryAddress: "Westlands, Nairobi",
		county: "Nairobi",
		courierService: "G4S",
		trackingNumber: "G4S123456789",
		estimatedDelivery: "2024-08-26",
		status: "in_transit",
		items: 2,
		totalWeight: "2.5 kg",
		deliveryFee: 500,
	},
	{
		id: "del-2",
		orderId: "EB-20240824-004",
		customerName: "Sarah Kimani",
		customerPhone: "0723456789",
		deliveryAddress: "Nyali, Mombasa",
		county: "Mombasa",
		courierService: "Posta Kenya",
		trackingNumber: "PK987654321",
		estimatedDelivery: "2024-08-27",
		status: "picked_up",
		items: 1,
		totalWeight: "1.2 kg",
		deliveryFee: 800,
	},
	{
		id: "del-3",
		orderId: "EB-20240823-003",
		customerName: "Mike Omondi",
		customerPhone: "0734567890",
		deliveryAddress: "Kisumu Town",
		county: "Kisumu",
		courierService: "G4S",
		trackingNumber: "G4S987654321",
		estimatedDelivery: "2024-08-25",
		actualDelivery: "2024-08-25",
		status: "delivered",
		items: 3,
		totalWeight: "3.8 kg",
		deliveryFee: 600,
	},
	{
		id: "del-4",
		orderId: "EB-20240822-002",
		customerName: "Jane Wambui",
		customerPhone: "0745678901",
		deliveryAddress: "Nakuru Town",
		county: "Nakuru",
		courierService: "Posta Kenya",
		trackingNumber: "PK123456789",
		estimatedDelivery: "2024-08-24",
		status: "out_for_delivery",
		items: 1,
		totalWeight: "0.8 kg",
		deliveryFee: 400,
	},
	{
		id: "del-5",
		orderId: "EB-20240821-001",
		customerName: "Brian Kipchoge",
		customerPhone: "0756789012",
		deliveryAddress: "Eldoret Town",
		county: "Eldoret",
		courierService: "G4S",
		trackingNumber: "G4S456789123",
		estimatedDelivery: "2024-08-23",
		status: "failed",
		items: 1,
		totalWeight: "1.5 kg",
		deliveryFee: 700,
		notes: "Customer not available at delivery address",
	},
]

const statusFilters = ["All", "Pending", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed"]

export default function AdminDeliveriesPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const filteredDeliveries = mockDeliveries.filter((delivery) => {
		const matchesSearch =
			delivery.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
			delivery.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			delivery.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
			delivery.county.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" ||
			delivery.status.toLowerCase().replace("_", " ") === statusFilter.toLowerCase()
		return matchesSearch && matchesStatus
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			pending: "bg-gray-500/20 text-gray-600",
			picked_up: "bg-blue-500/20 text-blue-600",
			in_transit: "bg-purple-500/20 text-purple-600",
			out_for_delivery: "bg-yellow-500/20 text-yellow-600",
			delivered: "bg-green-500/20 text-green-600",
			failed: "bg-red-500/20 text-red-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			pending: <Clock size={14} />,
			picked_up: <Package size={14} />,
			in_transit: <Truck size={14} />,
			out_for_delivery: <Truck size={14} />,
			delivered: <CheckCircle2 size={14} />,
			failed: <XCircle size={14} />,
		}
		return icons[status] || null
	}

	const deliveryStats = {
		total: mockDeliveries.length,
		pending: mockDeliveries.filter((d) => d.status === "pending").length,
		inTransit: mockDeliveries.filter((d) => d.status === "in_transit").length,
		outForDelivery: mockDeliveries.filter((d) => d.status === "out_for_delivery").length,
		delivered: mockDeliveries.filter((d) => d.status === "delivered").length,
		failed: mockDeliveries.filter((d) => d.status === "failed").length,
		totalRevenue: mockDeliveries.reduce((sum, d) => sum + d.deliveryFee, 0),
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Deliveries</h1>
					<p className="text-gray-500 mt-1">Track and manage order deliveries</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
				{[
					{
						label: "Total",
						count: deliveryStats.total,
						color: "bg-gray-500",
					},
					{
						label: "Pending",
						count: deliveryStats.pending,
						color: "bg-gray-500",
					},
					{
						label: "In Transit",
						count: deliveryStats.inTransit,
						color: "bg-purple-500",
					},
					{
						label: "Out for Delivery",
						count: deliveryStats.outForDelivery,
						color: "bg-yellow-500",
					},
					{
						label: "Delivered",
						count: deliveryStats.delivered,
						color: "bg-green-500",
					},
					{
						label: "Failed",
						count: deliveryStats.failed,
						color: "bg-red-500",
					},
				].map((stat, index) => (
					<motion.div
						key={stat.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05 }}
						className="glass-card p-3 text-center"
					>
						<p className="text-2xl font-bold">{stat.count}</p>
						<p className="text-xs text-gray-500 mt-1">{stat.label}</p>
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
							placeholder="Search by order ID, customer, tracking number, or county..."
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
				</div>
			</div>

			{/* Deliveries Table */}
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
									Destination
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Courier
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Tracking
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Est. Delivery
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
							{filteredDeliveries.map((delivery, index) => (
								<motion.tr
									key={delivery.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.03 }}
									className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition"
								>
									<td className="p-4">
										<span className="font-mono text-sm font-medium">{delivery.orderId}</span>
									</td>
									<td className="p-4">
										<div>
											<p className="font-medium text-sm">{delivery.customerName}</p>
											<p className="text-xs text-gray-500">{delivery.customerPhone}</p>
										</div>
									</td>
									<td className="p-4">
										<div className="flex items-start gap-1">
											<MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
											<div>
												<p className="text-sm">{delivery.deliveryAddress}</p>
												<p className="text-xs text-gray-500">{delivery.county}</p>
											</div>
										</div>
									</td>
									<td className="p-4">
										<div>
											<p className="text-sm font-medium">{delivery.courierService}</p>
											<p className="text-xs text-gray-500">{delivery.totalWeight}</p>
										</div>
									</td>
									<td className="p-4">
										<span className="font-mono text-xs">{delivery.trackingNumber}</span>
									</td>
									<td className="p-4">
										<div className="text-sm">
											<p>{delivery.estimatedDelivery}</p>
											{delivery.actualDelivery && (
												<p className="text-xs text-green-600">
													Delivered: {delivery.actualDelivery}
												</p>
											)}
										</div>
									</td>
									<td className="p-4">
										<span
											className={clsx(
												"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
												getStatusBadge(delivery.status),
											)}
										>
											{getStatusIcon(delivery.status)}
											{delivery.status.replace("_", " ").toUpperCase()}
										</span>
									</td>
									<td className="p-4">
										<div className="flex items-center gap-1">
											<button
												onClick={() => {
													setSelectedDelivery(delivery)
													setShowDetails(true)
												}}
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="View Details"
											>
												<Eye size={16} />
											</button>
											<button
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="Track"
											>
												<Truck size={16} />
											</button>
										</div>
									</td>
								</motion.tr>
							))}
						</tbody>
					</table>
				</div>

				{filteredDeliveries.length === 0 && (
					<div className="text-center py-16">
						<Truck className="mx-auto mb-4 text-gray-400" size={48} />
						<h3 className="text-lg font-semibold mb-2">No deliveries found</h3>
						<p className="text-gray-500">Try adjusting your search or filters</p>
					</div>
				)}

				<div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
					<p className="text-sm text-gray-500">
						Showing {filteredDeliveries.length} of {mockDeliveries.length} deliveries
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

			{/* Delivery Details Modal */}
			<AnimatePresence>
				{showDetails && selectedDelivery && (
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
									<h2 className="text-xl font-bold">Delivery Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Order & Tracking Info */}
									<div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
										<div>
											<p className="text-xs text-gray-500">Order ID</p>
											<p className="font-mono font-semibold">{selectedDelivery.orderId}</p>
										</div>
										<div className="text-right">
											<p className="text-xs text-gray-500">Tracking Number</p>
											<p className="font-mono font-semibold">{selectedDelivery.trackingNumber}</p>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Customer Info */}
									<div>
										<h3 className="font-semibold mb-3">Customer Information</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="flex items-center gap-2">
												<Users size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Name</p>
													<p className="text-sm font-medium">{selectedDelivery.customerName}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Phone size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Phone</p>
													<p className="text-sm font-medium">{selectedDelivery.customerPhone}</p>
												</div>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Delivery Address */}
									<div>
										<h3 className="font-semibold mb-3">Delivery Address</h3>
										<div className="flex items-start gap-2">
											<MapPin size={18} className="text-gray-400 mt-0.5" />
											<div>
												<p className="text-sm font-medium">{selectedDelivery.deliveryAddress}</p>
												<p className="text-xs text-gray-500">{selectedDelivery.county}</p>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Delivery Details */}
									<div>
										<h3 className="font-semibold mb-3">Delivery Details</h3>
										<div className="grid grid-cols-2 gap-4">
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<div className="flex items-center gap-2">
													<Truck size={20} className="text-gray-400" />
													<div>
														<p className="text-xs text-gray-500">Courier Service</p>
														<p className="text-sm font-medium">{selectedDelivery.courierService}</p>
													</div>
												</div>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<div className="flex items-center gap-2">
													<Package size={20} className="text-gray-400" />
													<div>
														<p className="text-xs text-gray-500">Items & Weight</p>
														<p className="text-sm font-medium">
															{selectedDelivery.items} items ({selectedDelivery.totalWeight})
														</p>
													</div>
												</div>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<div className="flex items-center gap-2">
													<Clock size={20} className="text-gray-400" />
													<div>
														<p className="text-xs text-gray-500">Estimated Delivery</p>
														<p className="text-sm font-medium">{selectedDelivery.estimatedDelivery}</p>
													</div>
												</div>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<div className="flex items-center gap-2">
													<DollarSign size={20} className="text-gray-400" />
													<div>
														<p className="text-xs text-gray-500">Delivery Fee</p>
														<p className="text-sm font-medium">
															KES {selectedDelivery.deliveryFee.toLocaleString()}
														</p>
													</div>
												</div>
											</div>
										</div>
									</div>

									{selectedDelivery.notes && (
										<>
											<hr className="border-gray-200 dark:border-gray-700" />
											<div>
												<h3 className="font-semibold mb-2">Notes</h3>
												<p className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl">
													{selectedDelivery.notes}
												</p>
											</div>
										</>
									)}

									{/* Actions */}
									<div className="flex gap-3">
										<button className="btn-primary flex-1">Update Status</button>
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
