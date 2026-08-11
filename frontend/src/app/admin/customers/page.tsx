"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
	Search,
	Mail,
	Phone,
	MapPin,
	ShoppingBag,
	Calendar,
	MoreVertical,
	UserPlus,
	Download,
	Filter,
	Eye,
	MessageSquare,
	Users,
	CheckCircle2,
	Star,
	XCircle,
	DollarSign,
} from "lucide-react"
import clsx from "clsx"

interface Customer {
	id: string
	name: string
	email: string
	phone: string
	location: string
	avatar: string
	totalOrders: number
	totalSpent: number
	joinedDate: string
	lastOrder: string
	status: "active" | "inactive" | "vip"
	ordersCount: number
}

const mockCustomers: Customer[] = [
	{
		id: "cust-1",
		name: "John Doe",
		email: "john@example.com",
		phone: "0712345678",
		location: "Nairobi, Kenya",
		avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
		totalOrders: 12,
		totalSpent: 245000,
		joinedDate: "2024-01-15",
		lastOrder: "2024-08-24",
		status: "vip",
		ordersCount: 12,
	},
	{
		id: "cust-2",
		name: "Sarah Kimani",
		email: "sarah@example.com",
		phone: "0723456789",
		location: "Mombasa, Kenya",
		avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
		totalOrders: 8,
		totalSpent: 189000,
		joinedDate: "2024-02-20",
		lastOrder: "2024-08-23",
		status: "active",
		ordersCount: 8,
	},
	{
		id: "cust-3",
		name: "Mike Omondi",
		email: "mike@example.com",
		phone: "0734567890",
		location: "Kisumu, Kenya",
		avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
		totalOrders: 3,
		totalSpent: 45000,
		joinedDate: "2024-05-10",
		lastOrder: "2024-08-20",
		status: "active",
		ordersCount: 3,
	},
	{
		id: "cust-4",
		name: "Jane Wambui",
		email: "jane@example.com",
		phone: "0745678901",
		location: "Nakuru, Kenya",
		avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80",
		totalOrders: 15,
		totalSpent: 367000,
		joinedDate: "2023-11-05",
		lastOrder: "2024-08-24",
		status: "vip",
		ordersCount: 15,
	},
	{
		id: "cust-5",
		name: "Brian Kipchoge",
		email: "brian@example.com",
		phone: "0756789012",
		location: "Eldoret, Kenya",
		avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
		totalOrders: 1,
		totalSpent: 15000,
		joinedDate: "2024-08-01",
		lastOrder: "2024-08-15",
		status: "active",
		ordersCount: 1,
	},
	{
		id: "cust-6",
		name: "Alice Muthoni",
		email: "alice@example.com",
		phone: "0767890123",
		location: "Nyeri, Kenya",
		avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80",
		totalOrders: 0,
		totalSpent: 0,
		joinedDate: "2024-08-20",
		lastOrder: "Never",
		status: "inactive",
		ordersCount: 0,
	},
]

const statusFilters = ["All", "Active", "VIP", "Inactive"]

export default function AdminCustomersPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const filteredCustomers = mockCustomers.filter((customer) => {
		const matchesSearch =
			customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			customer.phone.includes(searchQuery)
		const matchesStatus =
			statusFilter === "All" ||
			customer.status.toLowerCase() === statusFilter.toLowerCase()
		return matchesSearch && matchesStatus
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			active: "bg-green-500/20 text-green-600",
			vip: "bg-purple-500/20 text-purple-600",
			inactive: "bg-gray-500/20 text-gray-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			active: <CheckCircle2 size={14} />,
			vip: <Star size={14} />,
			inactive: <XCircle size={14} />,
		}
		return icons[status] || null
	}

	const customerStats = {
		total: mockCustomers.length,
		active: mockCustomers.filter((c) => c.status === "active").length,
		vip: mockCustomers.filter((c) => c.status === "vip").length,
		inactive: mockCustomers.filter((c) => c.status === "inactive").length,
		totalRevenue: mockCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Customers</h1>
					<p className="text-gray-500 mt-1">Manage your customer base</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export
					</button>
					<button className="btn-primary flex items-center gap-2">
						<UserPlus size={18} /> Add Customer
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{
						label: "Total Customers",
						value: customerStats.total.toString(),
						icon: Users,
						color: "text-blue-500",
					},
					{
						label: "Active",
						value: customerStats.active.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "VIP",
						value: customerStats.vip.toString(),
						icon: Star,
						color: "text-purple-500",
					},
					{
						label: "Total Revenue",
						value: `KES ${(customerStats.totalRevenue / 1000000).toFixed(2)}M`,
						icon: DollarSign,
						color: "text-orange-500",
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
							placeholder="Search customers by name, email, or phone..."
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

			{/* Customers Table */}
			<div className="glass-card overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Customer
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Contact
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Location
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Orders
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Total Spent
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Status
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Joined
								</th>
								<th className="p-4 text-left text-sm font-medium text-gray-500">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredCustomers.map((customer, index) => (
								<motion.tr
									key={customer.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.03 }}
									className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition"
								>
									<td className="p-4">
										<div className="flex items-center gap-3">
											<div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
												<Image
													src={customer.avatar}
													alt={customer.name}
													fill
													className="object-cover"
												/>
											</div>
											<div>
												<p className="font-medium text-sm">{customer.name}</p>
												<p className="text-xs text-gray-500">ID: {customer.id}</p>
											</div>
										</div>
									</td>
									<td className="p-4">
										<div className="space-y-1">
											<div className="flex items-center gap-1 text-xs">
												<Mail size={12} className="text-gray-400" />
												<span className="text-gray-600 dark:text-gray-400">
													{customer.email}
												</span>
											</div>
											<div className="flex items-center gap-1 text-xs">
												<Phone size={12} className="text-gray-400" />
												<span className="text-gray-600 dark:text-gray-400">
													{customer.phone}
												</span>
											</div>
										</div>
									</td>
									<td className="p-4">
										<div className="flex items-center gap-1 text-sm">
											<MapPin size={14} className="text-gray-400" />
											<span>{customer.location}</span>
										</div>
									</td>
									<td className="p-4 text-sm">{customer.ordersCount}</td>
									<td className="p-4 text-sm font-medium">
										KES {customer.totalSpent.toLocaleString()}
									</td>
									<td className="p-4">
										<span
											className={clsx(
												"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
												getStatusBadge(customer.status),
											)}
										>
											{getStatusIcon(customer.status)}
											{customer.status.toUpperCase()}
										</span>
									</td>
									<td className="p-4 text-sm text-gray-500">{customer.joinedDate}</td>
									<td className="p-4">
										<div className="flex items-center gap-1">
											<button
												onClick={() => {
													setSelectedCustomer(customer)
													setShowDetails(true)
												}}
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="View Details"
											>
												<Eye size={16} />
											</button>
											<button
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="Send Message"
											>
												<MessageSquare size={16} />
											</button>
											<button
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="More Options"
											>
												<MoreVertical size={16} />
											</button>
										</div>
									</td>
								</motion.tr>
							))}
						</tbody>
					</table>
				</div>

				{filteredCustomers.length === 0 && (
					<div className="text-center py-16">
						<Users className="mx-auto mb-4 text-gray-400" size={48} />
						<h3 className="text-lg font-semibold mb-2">No customers found</h3>
						<p className="text-gray-500">Try adjusting your search or filters</p>
					</div>
				)}

				<div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
					<p className="text-sm text-gray-500">
						Showing {filteredCustomers.length} of {mockCustomers.length} customers
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

			{/* Customer Details Modal */}
			<AnimatePresence>
				{showDetails && selectedCustomer && (
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
									<h2 className="text-xl font-bold">Customer Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Customer Info */}
									<div className="flex items-center gap-4">
										<div className="relative h-20 w-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
											<Image
												src={selectedCustomer.avatar}
												alt={selectedCustomer.name}
												fill
												className="object-cover"
											/>
										</div>
										<div>
											<h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
											<p className="text-gray-500">{selectedCustomer.email}</p>
											<span
												className={clsx(
													"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2",
													getStatusBadge(selectedCustomer.status),
												)}
											>
												{getStatusIcon(selectedCustomer.status)}
												{selectedCustomer.status.toUpperCase()}
											</span>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Contact Info */}
									<div>
										<h3 className="font-semibold mb-3">Contact Information</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="flex items-center gap-2">
												<Mail size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Email</p>
													<p className="text-sm font-medium">{selectedCustomer.email}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Phone size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Phone</p>
													<p className="text-sm font-medium">{selectedCustomer.phone}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<MapPin size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Location</p>
													<p className="text-sm font-medium">{selectedCustomer.location}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Calendar size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Joined</p>
													<p className="text-sm font-medium">{selectedCustomer.joinedDate}</p>
												</div>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Order Stats */}
									<div>
										<h3 className="font-semibold mb-3">Order Statistics</h3>
										<div className="grid grid-cols-2 gap-4">
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-2xl font-bold text-primary">
													{selectedCustomer.ordersCount}
												</p>
												<p className="text-sm text-gray-500">Total Orders</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-2xl font-bold text-green-600">
													KES {selectedCustomer.totalSpent.toLocaleString()}
												</p>
												<p className="text-sm text-gray-500">Total Spent</p>
											</div>
										</div>
									</div>

									{/* Actions */}
									<div className="flex gap-3">
										<button className="btn-primary flex-1">Send Message</button>
										<button className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition">
											View Order History
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