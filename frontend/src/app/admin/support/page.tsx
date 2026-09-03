"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Ticket,
	Search,
	Eye,
	MessageSquare,
	Clock,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Download,
	Mail,
	Phone,
	Users,
	Send,
	Loader2,
	Package,
	UserCheck,
} from "lucide-react"
import clsx from "clsx"

interface SupportTicket {
	id: string
	customerName: string
	customerEmail: string
	customerPhone?: string
	subject: string
	description: string
	category: string
	priority: string
	status: string
	createdAt: string
	updatedAt: string
	assignedTo?: string
	attachments?: string[]
	replies?: Array<{
		id: string
		reply: string
		isAdmin: boolean
		createdAt: string
	}>
}

interface TicketStats {
	total: number
	open: number
	inProgress: number
	waiting: number
	resolved: number
	closed: number
}

const statusFilters = ["All", "Open", "In Progress", "Waiting Customer", "Resolved", "Closed"]
const priorityFilters = ["All", "Urgent", "High", "Medium", "Low"]
const categoryFilters = ["All", "Technical", "Billing", "Shipping", "Product", "Other"]

export default function AdminSupportPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [priorityFilter, setPriorityFilter] = useState("All")
	const [categoryFilter, setCategoryFilter] = useState("All")
	const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
	const [showDetails, setShowDetails] = useState(false)
	const [tickets, setTickets] = useState<SupportTicket[]>([])
	const [stats, setStats] = useState<TicketStats>({
		total: 0,
		open: 0,
		inProgress: 0,
		waiting: 0,
		resolved: 0,
		closed: 0,
	})
	const [loading, setLoading] = useState(true)
	const [replyText, setReplyText] = useState("")
	const [updatingTicket, setUpdatingTicket] = useState(false)
	const [replying, setReplying] = useState(false)
	const [exporting, setExporting] = useState(false)

	useEffect(() => {
		fetchTickets()
		fetchStats()
	}, [statusFilter, priorityFilter, categoryFilter, searchQuery])

	const fetchTickets = async () => {
		try {
			setLoading(true)
			const params = new URLSearchParams({
				status: statusFilter,
				priority: priorityFilter,
				category: categoryFilter,
				search: searchQuery,
			})
			const response = await fetch(`/api/support/tickets?${params.toString()}`)

			if (!response.ok) {
				throw new Error("Failed to fetch tickets")
			}

			const data = await response.json()
			setTickets(
				data.tickets.map((t: SupportTicket) => ({
					...t,
					createdAt: t.createdAt,
					updatedAt: t.updatedAt,
				})),
			)
		} catch (err) {
			console.error("Error fetching tickets:", err)
		} finally {
			setLoading(false)
		}
	}

	const fetchStats = async () => {
		try {
			const response = await fetch(`/api/support/tickets?stats=true`)
			if (response.ok) {
				const data = await response.json()
				setStats(data)
			}
		} catch (err) {
			console.error("Error fetching stats:", err)
		}
	}

	const handleViewDetails = (ticket: SupportTicket) => {
		setSelectedTicket(ticket)
		setShowDetails(true)
		setReplyText("")
	}

	const handleStatusChange = async (ticketId: string, newStatus: string) => {
		setUpdatingTicket(true)
		try {
			const response = await fetch(`/api/support/tickets/${ticketId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: newStatus }),
			})

			if (response.ok) {
				setTickets(
					tickets.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)),
				)
				if (selectedTicket?.id === ticketId) {
					setSelectedTicket({ ...selectedTicket, status: newStatus })
				}
			}
		} catch (err) {
			console.error("Error updating ticket status:", err)
		} finally { setUpdatingTicket(false) }
	}

	const handleSendReply = async () => {
		if (!replyText.trim() || !selectedTicket) return

		setReplying(true)
		try {
			const response = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reply: replyText }),
			})

			if (response.ok) {
				const newReply = await response.json()
				if (selectedTicket) {
					setSelectedTicket({
						...selectedTicket,
						replies: [...(selectedTicket.replies || []), newReply],
					})
				}
				setReplyText("")
			}
		} catch (err) {
			console.error("Error sending reply:", err)
		} finally { setReplying(false) }
	}

	const handleExport = async () => {
		setExporting(true)
		try {
			const response = await fetch("/api/analytics/export?timeRange=30d&format=csv")
			if (response.ok) {
				const blob = await response.blob()
				const url = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = url
				a.download = `support-tickets-${new Date().toISOString().split("T")[0]}.csv`
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)
			}
		} catch (err) {
			console.error("Error exporting tickets:", err)
		} finally { setExporting(false) }
	}

	const filteredTickets = tickets

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			open: "bg-red-500/20 text-red-600",
			in_progress: "bg-blue-500/20 text-blue-600",
			waiting_customer: "bg-yellow-500/20 text-yellow-600",
			resolved: "bg-green-500/20 text-green-600",
			closed: "bg-gray-500/20 text-gray-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			open: <AlertTriangle size={14} />,
			in_progress: <Clock size={14} />,
			waiting_customer: <MessageSquare size={14} />,
			resolved: <CheckCircle2 size={14} />,
			closed: <XCircle size={14} />,
		}
		return icons[status] || null
	}

	const getPriorityBadge = (priority: string) => {
		const styles: Record<string, string> = {
			urgent: "bg-red-500/20 text-red-600",
			high: "bg-orange-500/20 text-orange-600",
			medium: "bg-yellow-500/20 text-yellow-600",
			low: "bg-blue-500/20 text-blue-600",
		}
		return styles[priority] || "bg-gray-500/20 text-gray-600"
	}

	const getCategoryIcon = (category: string): React.ReactNode => {
		const icons: Record<string, React.ReactNode> = {
			technical: <AlertTriangle size={24} />,
			billing: <Mail size={24} />,
			shipping: <Package size={24} />,
			product: <Ticket size={24} />,
			other: <MessageSquare size={24} />,
		}
		return icons[category] || <MessageSquare size={24} />
	}

	const getCategoryLabel = (category: string) => {
		return category.charAt(0).toUpperCase() + category.slice(1)
	}

	const getPriorityLabel = (priority: string) => {
		return priority.charAt(0).toUpperCase() + priority.slice(1)
	}

	const getStatusLabel = (status: string) => {
		return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Support Tickets</h1>
					<p className="text-gray-500 mt-1">Manage customer support requests</p>
				</div>
				<div className="flex gap-3">
					<button
						onClick={handleExport}
						disabled={exporting}
						className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
					>
						{exporting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Download size={18} />} {exporting ? "Exporting…" : "Export"}
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{ label: "Total Tickets", value: stats.total.toString(), icon: Ticket, color: "text-blue-500" },
					{ label: "Open", value: stats.open.toString(), icon: AlertTriangle, color: "text-red-500" },
					{ label: "In Progress", value: stats.inProgress.toString(), icon: Clock, color: "text-yellow-500" },
					{ label: "Resolved", value: stats.resolved.toString(), icon: CheckCircle2, color: "text-green-500" },
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
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
						<input
							type="text"
							placeholder="Search tickets by subject, customer, or description..."
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
									statusFilter === filter ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20",
								)}
							>
								{filter}
							</button>
						))}
					</div>
					<div className="flex gap-2 overflow-x-auto">
						{priorityFilters.map((filter) => (
							<button
								key={filter}
								onClick={() => setPriorityFilter(filter)}
								className={clsx(
									"px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
									priorityFilter === filter ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20",
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
									categoryFilter === filter ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20",
								)}
							>
								{filter}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Tickets List */}
			<div className="space-y-4">
				{loading ? (
					<div className="text-center py-16">
						<div className="text-lg text-gray-500">Loading tickets...</div>
					</div>
				) : (
					filteredTickets.map((ticket, index) => {
						const CategoryIcon = getCategoryIcon(ticket.category)
						return (
							<motion.div
								key={ticket.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.05 }}
								className="glass-card p-6 hover:scale-[1.01] transition cursor-pointer"
								onClick={() => handleViewDetails(ticket)}
							>
								<div className="flex items-start gap-4">
									{/* Category Icon */}
									<div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
										{CategoryIcon}
									</div>

									{/* Ticket Content */}
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between mb-2">
											<div>
												<h3 className="font-semibold text-sm mb-1">{ticket.subject}</h3>
												<p className="text-xs text-gray-500">
													{ticket.id} • {ticket.customerName} • {new Date(ticket.createdAt).toLocaleDateString()}
												</p>
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												<span
													className={clsx(
														"px-2 py-1 rounded-full text-xs font-medium",
														getPriorityBadge(ticket.priority),
													)}
												>
													{ticket.priority.toUpperCase()}
												</span>
												<span
													className={clsx(
														"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
														getStatusBadge(ticket.status),
													)}
												>
													{getStatusIcon(ticket.status)}
													{ticket.status.replace("_", " ").toUpperCase()}
												</span>
											</div>
										</div>

										<p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
											{ticket.description}
										</p>

										<div className="flex items-center justify-between">
											<div className="flex items-center gap-4 text-xs text-gray-500">
												<span className="capitalize">{getCategoryLabel(ticket.category)}</span>
												{ticket.assignedTo && <span>Assigned to: {ticket.assignedTo}</span>}
												{ticket.replies && ticket.replies.length > 0 && (
													<span className="flex items-center gap-1">
														<MessageSquare size={12} />
														{ticket.replies.length} replies
													</span>
												)}
											</div>

											<button
												onClick={(e) => {
													e.stopPropagation()
													handleViewDetails(ticket)
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
					})
				)}
			</div>

			{!loading && filteredTickets.length === 0 && (
				<div className="text-center py-16">
					<Ticket className="mx-auto mb-4 text-gray-400" size={48} />
					<h3 className="text-lg font-semibold mb-2">No tickets found</h3>
					<p className="text-gray-500">Try adjusting your search or filters</p>
				</div>
			)}

			{/* Ticket Details Modal */}
			<AnimatePresence>
				{showDetails && selectedTicket && (
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
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl z-50 max-h-[90vh] overflow-y-auto"
						>
							<div className="glass-card p-6">
								<div className="flex items-center justify-between mb-6">
									<h2 className="text-xl font-bold">Ticket Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Ticket Header */}
									<div>
										<div className="flex items-start justify-between mb-2">
											<h3 className="font-semibold text-lg">{selectedTicket.subject}</h3>
							<select
								value={selectedTicket.status}
								onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
								disabled={updatingTicket}
								className="form-select text-sm"
							>
												<option value="open">Open</option>
												<option value="in_progress">In Progress</option>
												<option value="waiting_customer">Waiting Customer</option>
												<option value="resolved">Resolved</option>
												<option value="closed">Closed</option>
							</select>{updatingTicket && <Loader2 size={15} className="ml-2 inline animate-spin" aria-hidden="true" />}
										</div>
										<p className="text-xs text-gray-500">
											{selectedTicket.id} • Created {new Date(selectedTicket.createdAt).toLocaleDateString()} • Last updated {new Date(selectedTicket.updatedAt).toLocaleDateString()}
										</p>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Customer Info */}
									<div>
										<h3 className="font-semibold mb-3 flex items-center gap-2">
											<Users size={18} />
											Customer Information
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<div className="flex items-center gap-2">
												<Users size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Name</p>
													<p className="text-sm font-medium">{selectedTicket.customerName}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Mail size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Email</p>
													<p className="text-sm font-medium">{selectedTicket.customerEmail}</p>
												</div>
											</div>
											{selectedTicket.customerPhone && (
												<div className="flex items-center gap-2">
													<Phone size={18} className="text-gray-400" />
													<div>
														<p className="text-xs text-gray-500">Phone</p>
														<p className="text-sm font-medium">{selectedTicket.customerPhone}</p>
													</div>
												</div>
											)}
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Description */}
									<div>
										<h3 className="font-semibold mb-3">Description</h3>
										<p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
											{selectedTicket.description}
										</p>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Ticket Meta */}
									<div>
										<h3 className="font-semibold mb-3">Details</h3>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-xs text-gray-500">Category</p>
												<p className="text-sm font-medium capitalize">{getCategoryLabel(selectedTicket.category)}</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-xs text-gray-500">Priority</p>
												<p className="text-sm font-medium capitalize">{getPriorityLabel(selectedTicket.priority)}</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-xs text-gray-500">Assigned To</p>
												<p className="text-sm font-medium">{selectedTicket.assignedTo || "Unassigned"}</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-xs text-gray-500">Last Updated</p>
												<p className="text-sm font-medium">{new Date(selectedTicket.updatedAt).toLocaleString()}</p>
											</div>
										</div>
									</div>

									{/* Replies Section */}
									{selectedTicket.replies && selectedTicket.replies.length > 0 && (
										<div>
											<h3 className="font-semibold mb-3">Conversation</h3>
											<div className="space-y-4">
												{selectedTicket.replies.map((reply) => (
													<div
														key={reply.id}
														className={clsx(
															"p-4 rounded-xl",
															reply.isAdmin ? "bg-primary/10 ml-auto" : "bg-gray-50 dark:bg-gray-800",
														)}
													>
														<div className="flex items-center gap-2 mb-2">
															{reply.isAdmin ? (
																<UserCheck size={14} className="text-primary" />
															) : (
																<Users size={14} className="text-gray-400" />
															)}
															<span className="text-xs font-medium">
																{reply.isAdmin ? "Support Agent" : selectedTicket.customerName}
															</span>
															<span className="text-xs text-gray-500">
																{new Date(reply.createdAt).toLocaleString()}
															</span>
														</div>
														<p className="text-sm">{reply.reply}</p>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Reply Box */}
									<div>
										<h3 className="font-semibold mb-3">Send Reply</h3>
										<textarea
											value={replyText}
											onChange={(e) => setReplyText(e.target.value)}
											placeholder="Type your response here..."
											className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
											rows={4}
										/>
						<button
							onClick={handleSendReply}
							disabled={!replyText.trim() || replying}
							className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50"
						>
							{replying ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} />}
							{replying ? "Sending…" : "Send Reply"}
										</button>
									</div>

									{/* Actions */}
									<div className="flex gap-3">
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
