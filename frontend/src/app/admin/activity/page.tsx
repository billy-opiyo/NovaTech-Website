"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Activity,
	Search,
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
	RefreshCw,
	Star,
} from "lucide-react"
import clsx from "clsx"

interface AdminLog {
	id: string
	adminId: string
	action: string
	details: Record<string, unknown> | null
	createdAt: string
	admin?: {
		name: string | null
		email: string | null
	} | null
}

interface LogsResponse {
	logs: AdminLog[]
	total: number
	page: number
	totalPages: number
	actions: string[]
}

interface LogStats {
	totalLogs: number
	todayLogs: number
	mostCommonActions: { action: string; _count: { _all: number } }[]
}

const actionIcons: Record<string, React.ElementType> = {
	UPDATED_PRODUCT: Package,
	CREATED_PRODUCT: Package,
	DELETED_PRODUCT: Package,
	UPDATED_ORDER: ShoppingCart,
	DELETED_REVIEW: Star,
	UPDATED_SETTINGS: Settings,
	LOGIN: Shield,
	LOGOUT: Shield,
}

function getActionIcon(action: string) {
	const key = Object.keys(actionIcons).find((k) => action.includes(k))
	return actionIcons[key || ""] || Activity
}

function getStatusBadge(action: string) {
	if (action.includes("FAILED") || action.includes("DELETE")) {
		return "bg-red-500/20 text-red-600"
	}
	if (action.includes("LOGIN") || action.includes("SECURITY")) {
		return "bg-yellow-500/20 text-yellow-600"
	}
	return "bg-green-500/20 text-green-600"
}

function getStatusIcon(action: string) {
	if (action.includes("FAILED") || action.includes("DELETE")) {
		return <XCircle size={14} />
	}
	if (action.includes("LOGIN") || action.includes("SECURITY")) {
		return <AlertTriangle size={14} />
	}
	return <CheckCircle2 size={14} />
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export default function AdminActivityPage() {
	const [logs, setLogs] = useState<AdminLog[]>([])
	const [stats, setStats] = useState<LogStats | null>(null)
	const [actions, setActions] = useState<string[]>([])
	const [searchQuery, setSearchQuery] = useState("")
	const [actionFilter, setActionFilter] = useState("All")
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const fetchLogs = useCallback(async () => {
		setIsLoading(true)
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: "20",
			})
			if (actionFilter !== "All") params.set("action", actionFilter)
			if (searchQuery) params.set("search", searchQuery)

			const [logsRes, statsRes] = await Promise.all([
				fetch(`/api/admin/logs?${params.toString()}`),
				fetch("/api/admin/logs?stats=true"),
			])

			if (logsRes.ok) {
				const data: LogsResponse = await logsRes.json()
				setLogs(data.logs)
				setTotal(data.total)
				setTotalPages(data.totalPages)
				setActions(data.actions)
			}
			if (statsRes.ok) {
				setStats(await statsRes.json())
			}
		} catch (error) {
			console.error("Failed to fetch admin logs:", error)
		} finally {
			setIsLoading(false)
		}
	}, [page, actionFilter, searchQuery])

	useEffect(() => {
		fetchLogs()
	}, [fetchLogs])

	const filteredLogs = logs.filter((log) => {
		if (!searchQuery) return true
		const q = searchQuery.toLowerCase()
		return (
			log.action.toLowerCase().includes(q) ||
			log.admin?.name?.toLowerCase().includes(q) ||
			log.admin?.email?.toLowerCase().includes(q) ||
			log.adminId.toLowerCase().includes(q)
		)
	})

	const activityStats = {
		total: stats?.totalLogs ?? total,
		today: stats?.todayLogs ?? 0,
		success: stats?.mostCommonActions?.length ?? 0,
	}

	function exportLogs() {
		const escape = (value: string) => `"${value.replaceAll('"', '""')}"`
		const rows = [
			["Action", "Admin", "Email", "Created at", "Details"],
			...filteredLogs.map((log) => [
				log.action,
				log.admin?.name || "",
				log.admin?.email || "",
				formatDate(log.createdAt),
				log.details ? JSON.stringify(log.details) : "",
			]),
		]
		const csv = rows.map((row) => row.map(escape).join(",")).join("\n")
		const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
		const link = document.createElement("a")
		link.href = url
		link.download = `admin-activity-${new Date().toISOString().slice(0, 10)}.csv`
		link.click()
		URL.revokeObjectURL(url)
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
					<button
						onClick={fetchLogs}
						className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
					>
						<RefreshCw size={18} /> Refresh
					</button>
					<button onClick={exportLogs} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
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
						label: "Today",
						value: activityStats.today.toString(),
						icon: Clock,
						color: "text-purple-500",
					},
					{
						label: "Distinct Actions",
						value: actions.length.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "Page",
						value: `${page}/${totalPages}`,
						icon: Info,
						color: "text-yellow-500",
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
				<div className="relative flex-1">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
						size={18}
					/>
					<input
						type="text"
						placeholder="Search by action, admin name, or email..."
						value={searchQuery}
						onChange={(e) => {
							setSearchQuery(e.target.value)
							setPage(1)
						}}
						className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>
				<div className="flex gap-2 overflow-x-auto">
					<button
						onClick={() => {
							setActionFilter("All")
							setPage(1)
						}}
						className={clsx(
							"px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
							actionFilter === "All"
								? "bg-primary text-white"
								: "bg-white/10 hover:bg-white/20",
						)}
					>
						All
					</button>
					{actions.map((action) => (
						<button
							key={action}
							onClick={() => {
								setActionFilter(action)
								setPage(1)
							}}
							className={clsx(
								"px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
								actionFilter === action
									? "bg-primary text-white"
									: "bg-white/10 hover:bg-white/20",
							)}
						>
							{action.replace(/_/g, " ")}
						</button>
					))}
				</div>
			</div>

			{/* Activity Timeline */}
			{isLoading ? (
				<div className="text-center py-16">
					<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
					<p className="text-gray-500">Loading activity logs...</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredLogs.map((log, index) => {
						const CategoryIcon = getActionIcon(log.action)
						return (
							<motion.div
								key={log.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.05 }}
								className="glass-card p-6 hover:scale-[1.01] transition cursor-pointer"
							>
								<div className="flex items-start gap-4">
									<div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
										<CategoryIcon size={24} />
									</div>

									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between mb-2">
											<div>
												<h3 className="font-semibold text-sm mb-1">
													{log.action.replace(/_/g, " ")}
												</h3>
												<p className="text-xs text-gray-500">
													{log.admin?.name || log.adminId} •{" "}
													{log.admin?.email || "Unknown"} • {formatDate(log.createdAt)}
												</p>
											</div>
											<span
												className={clsx(
													"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
													getStatusBadge(log.action),
												)}
											>
												{getStatusIcon(log.action)}
												{log.action.includes("FAILED") ? "FAILED" : "SUCCESS"}
											</span>
										</div>

										{log.details && (
											<pre className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg mb-3 overflow-x-auto">
												{JSON.stringify(log.details, null, 2)}
											</pre>
										)}

										<div className="flex items-center justify-between">
											<div className="flex items-center gap-4 text-xs text-gray-500">
												<span>ID: {log.id.slice(-8).toUpperCase()}</span>
											</div>

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
							</motion.div>
						)
					})}

					{filteredLogs.length === 0 && (
						<div className="text-center py-16">
							<Activity className="mx-auto mb-4 text-gray-400" size={48} />
							<h3 className="text-lg font-semibold mb-2">No activity logs found</h3>
							<p className="text-gray-500">Try adjusting your search or filters</p>
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2 pt-4">
							<button
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
							>
								Previous
							</button>
							<span className="text-sm text-gray-500">
								Page {page} of {totalPages}
							</span>
							<button
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
							>
								Next
							</button>
						</div>
					)}
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
									<div>
										<div className="flex items-start justify-between mb-2">
											<h3 className="font-semibold text-lg">
												{selectedLog.action.replace(/_/g, " ")}
											</h3>
											<span
												className={clsx(
													"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
													getStatusBadge(selectedLog.action),
												)}
											>
												{getStatusIcon(selectedLog.action)}
												{selectedLog.action.includes("FAILED") ? "FAILED" : "SUCCESS"}
											</span>
										</div>
										<p className="text-xs text-gray-500">
											{selectedLog.id} • {formatDate(selectedLog.createdAt)}
										</p>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									<div>
										<h3 className="font-semibold mb-3">Admin Information</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="flex items-center gap-2">
												<User size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Name</p>
													<p className="text-sm font-medium">
														{selectedLog.admin?.name || "Unknown"}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Shield size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Admin ID</p>
													<p className="text-sm font-medium">{selectedLog.adminId}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Activity size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Email</p>
													<p className="text-sm font-medium">
														{selectedLog.admin?.email || "N/A"}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Clock size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Timestamp</p>
													<p className="text-sm font-medium">
														{formatDate(selectedLog.createdAt)}
													</p>
												</div>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									<div>
										<h3 className="font-semibold mb-3">Activity Information</h3>
										<div className="space-y-4">
											<div>
												<p className="text-xs text-gray-500 mb-1">Action</p>
												<p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
													{selectedLog.action.replace(/_/g, " ")}
												</p>
											</div>
											{selectedLog.details && (
												<div>
													<p className="text-xs text-gray-500 mb-1">Details</p>
													<pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl overflow-x-auto">
														{JSON.stringify(selectedLog.details, null, 2)}
													</pre>
												</div>
											)}
										</div>
									</div>

									<div className="flex gap-3">
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
