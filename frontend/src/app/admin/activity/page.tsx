"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Activity,
	Search,
	Filter,
	Eye,
	Download,
	User,
	Package,
	ShoppingCart,
	Settings,
	Shield,
	Clock,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Info,
} from "lucide-react"
import clsx from "clsx"

interface ActivityLog {
	id: string
	userId: string
	userName: string
	userRole: string
	action: string
	description: string
	category: "user" | "product" | "order" | "settings" | "security" | "other"
	ipAddress: string
	timestamp: string
	status: "success" | "failed" | "warning"
	details?: string
}

const mockActivityLogs: ActivityLog[] = [
	{
		id: "act-1",
		userId: "user-1",
		userName: "Admin User",
		userRole: "SUPERADMIN",
		action: "Updated Product",
		description: "Updated stock quantity for iPhone 15 Pro Max",
		category: "product",
		ipAddress: "192.168.1.100",
		timestamp: "2024-08-24 09:45:00",
		status: "success",
		details: "Changed stock from 20 to 25 units",
	},
	{
		id: "act-2",
		userId: "user-2",
		userName: "John Doe",
		userRole: "ADMIN",
		action: "Order Status Update",
		description: "Changed order EB-20240824-005 status from Processing to Shipped",
		category: "order",
		ipAddress: "192.168.1.101",
		timestamp: "2024-08-24 09:30:00",
		status: "success",
	},
	{
		id: "act-3",
		userId: "user-1",
		userName: "Admin User",
		userRole: "SUPERADMIN",
		action: "Login Attempt Failed",
		description: "Failed login attempt from unknown IP",
		category: "security",
		ipAddress: "203.0.113.45",
		timestamp: "2024-08-24 03:22:00",
		status: "failed",
		details: "Invalid credentials provided",
	},
	{
		id: "act-4",
		userId: "user-3",
		userName: "Sarah Kimani",
		userRole: "ADMIN",
		action: "Coupon Created",
		description: "Created new coupon code TECH20 for 20% off laptops",
		category: "settings",
		ipAddress: "192.168.1.102",
		timestamp: "2024-08-24 08:15:00",
		status: "success",
	},
	{
		id: "act-5",
		userId: "user-2",
		userName: "John Doe",
		userRole: "ADMIN",
		action: "Customer Status Changed",
		description: "Changed customer status to VIP",
		category: "user",
		ipAddress: "192.168.1.101",
		timestamp: "2024-08-23 16:20:00",
		status: "success",
		details: "Customer ID: cust-123",
	},
	{
		id: "act-6",
		userId: "user-1",
		userName: "Admin User",
		userRole: "SUPERADMIN",
		action: "Settings Updated",
		description: "Updated email configuration settings",
		category: "settings",
		ipAddress: "192.168.1.100",
		timestamp: "2024-08-23 14:10:00",
		status: "success",
	},
]

const statusFilters = ["All", "Success", "Failed", "Warning"]
const categoryFilters = ["All", "User", "Product", "Order", "Settings", "Security", "Other"]

export default function AdminActivityPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [categoryFilter, setCategoryFilter] = useState("All")
	const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const filteredLogs = mockActivityLogs.filter((log) => {
		const matchesSearch =
			log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.ipAddress.includes(searchQuery)
		const matchesStatus =
			statusFilter === "All" || log.status.toLowerCase() === statusFilter.toLowerCase()
		const matchesCategory =
			categoryFilter === "All" || log.category.toLowerCase() === categoryFilter.toLowerCase()
		return matchesSearch && matchesStatus && matchesCategory
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			success: "bg-green-500/20 text-green-600",
			failed: "bg-red-500/20 text-red-600",
			warning: "bg-yellow-500/20 text-yellow-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			success: <CheckCircle2 size={14} />,
			failed: <XCircle size={14} />,
			warning: <AlertTriangle size={14} />,
		}
		return icons[status] || <Info size={14} />
	}

	const getCategoryIcon = (category: string) => {
		const icons: Record<string, React.ElementType> = {
			user: User,
			product: Package,
			order: ShoppingCart,
			settings: Settings,
			security: Shield,
			other: Activity,
		}
		return icons[category] || Activity
	}

	const activityStats = {
		total: mockActivityLogs.length,
		success: mockActivityLogs.filter((l) => l.status === "success").length,
		failed: mockActivityLogs.filter((l) => l.status === "failed").length,
		warning: mockActivityLogs.filter((l) => l.status === "warning").length,
		today: mockActivityLogs.filter((l) => l.timestamp.startsWith("2024-08-24")).length,
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Activity Log</h1>
					<p className="text-gray-500 mt-1">Track all admin actions and system events</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export Logs
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{
						label: "Total Activities",
						value: activityStats.total.toString(),
						icon: Activity,
						color: "text-blue-500",
					},
					{
						label: "Successful",
						value: activityStats.success.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "Failed",
						value: activityStats.failed.toString(),
						icon: XCircle,
						color: "text-red-500",
					},
					{
						label: "Today",
						value: activityStats.today.toString(),
						icon: Clock,
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
			<div className="glass-card p-4 mb-6 space-y-4">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="relative flex-1">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							placeholder="Search by user, action, description, or IP..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
				</div>
				<div className="flex flex-col md:flex-row gap-2">
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
					<div className="flex gap-2 overflow-x-auto">
						{categoryFilters.map((filter) => (
							<button
								key={filter}
								onClick={() => setCategoryFilter(filter)}
								className={clsx(
									"px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
									categoryFilter === filter
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

			{/* Activity Timeline */}
			<div className="space-y-4">
				{filteredLogs.map((log, index) => {
					const CategoryIcon = getCategoryIcon(log.category)
					return (
						<motion.div
							key={log.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
							className="glass-card p-6 hover:scale-[1.01] transition cursor-pointer"
						>
							<div className="flex items-start gap-4">
								{/* Category Icon */}
								<div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
									<CategoryIcon size={24} />
								</div>

								{/* Activity Content */}
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between mb-2">
										<div>
											<h3 className="font-semibold text-sm mb-1">{log.action}</h3>
											<p className="text-xs text-gray-500">
												{log.userName} • {log.userRole} • {log.timestamp}
											</p>
										</div>
										<span
											className={clsx(
												"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
												getStatusBadge(log.status),
											)}
										>
											{getStatusIcon(log.status)}
											{log.status.toUpperCase()}
										</span>
									</div>

									<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
										{log.description}
									</p>

									{log.details && (
										<p className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg mb-3">
											{log.details}
										</p>
									)}

									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4 text-xs text-gray-500">
											<span className="capitalize">{log.category}</span>
											<span>IP: {log.ipAddress}</span>
										</div>

										<div className="flex items-center gap-1">
											<button
												onClick={() => {
													setSelectedLog(log)
													setShowDetails(true)
												}}
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="View Details"
											>
												<Eye size={16} />
											</button>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)
				})}
			</div>

			{filteredLogs.length === 0 && (
				<div className="text-center py-16">
					<Activity className="mx-auto mb-4 text-gray-400" size={48} />
					<h3 className="text-lg font-semibold mb-2">No activity logs found</h3>
					<p className="text-gray-500">Try adjusting your search or filters</p>
				</div>
			)}

			{/* Activity Details Modal */}
			<AnimatePresence>
				{showDetails && selectedLog && (
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
									<h2 className="text-xl font-bold">Activity Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Activity Header */}
									<div>
										<div className="flex items-start justify-between mb-2">
											<h3 className="font-semibold text-lg">{selectedLog.action}</h3>
											<span
												className={clsx(
													"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
													getStatusBadge(selectedLog.status),
												)}
											>
												{getStatusIcon(selectedLog.status)}
												{selectedLog.status.toUpperCase()}
											</span>
										</div>
										<p className="text-xs text-gray-500">
											{selectedLog.id} • {selectedLog.timestamp}
										</p>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* User Info */}
									<div>
										<h3 className="font-semibold mb-3">User Information</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="flex items-center gap-2">
												<User size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Name</p>
													<p className="text-sm font-medium">{selectedLog.userName}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Shield size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Role</p>
													<p className="text-sm font-medium">{selectedLog.userRole}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Activity size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">User ID</p>
													<p className="text-sm font-medium">{selectedLog.userId}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Clock size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Timestamp</p>
													<p className="text-sm font-medium">{selectedLog.timestamp}</p>
												</div>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Activity Details */}
									<div>
										<h3 className="font-semibold mb-3">Activity Information</h3>
										<div className="space-y-4">
											<div>
												<p className="text-xs text-gray-500 mb-1">Description</p>
												<p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
													{selectedLog.description}
												</p>
											</div>
											{selectedLog.details && (
												<div>
													<p className="text-xs text-gray-500 mb-1">Additional Details</p>
													<p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
														{selectedLog.details}
													</p>
												</div>
											)}
											<div className="grid grid-cols-2 gap-4">
												<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
													<p className="text-xs text-gray-500">Category</p>
													<p className="text-sm font-medium capitalize">{selectedLog.category}</p>
												</div>
												<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
													<p className="text-xs text-gray-500">IP Address</p>
													<p className="text-sm font-medium font-mono">{selectedLog.ipAddress}</p>
												</div>
											</div>
										</div>
									</div>

									{/* Actions */}
									<div className="flex gap-3">
										<button className="btn-primary flex-1">View Related Data</button>
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