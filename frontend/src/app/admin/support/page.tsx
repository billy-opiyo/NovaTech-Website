"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import {
	Ticket,
	Search,
	Filter,
	Eye,
	MessageSquare,
	Clock,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Download,
	Mail,
	Phone,
} from "lucide-react"
import clsx from "clsx"

interface SupportTicket {
	id: string
	customerName: string
	customerEmail: string
	customerPhone: string
	subject: string
	description: string
	category: "technical" | "billing" | "shipping" | "product" | "other"
	priority: "low" | "medium" | "high" | "urgent"
	status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed"
	createdAt: string
	updatedAt: string
	assignedTo?: string
	attachments?: string[]
}

const mockTickets: SupportTicket[] = [
	{
		id: "tkt-1",
		customerName: "John Doe",
		customerEmail: "john@example.com",
		customerPhone: "0712345678",
		subject: "Product not working as expected",
		description: "I purchased a laptop 3 days ago and it keeps shutting down randomly. I've tried charging it but the issue persists.",
		category: "technical",
		priority: "high",
		status: "in_progress",
		createdAt: "2024-08-24",
		updatedAt: "2024-08-24",
		assignedTo: "Support Team A",
	},
	{
		id: "tkt-2",
		customerName: "Sarah Kimani",
		customerEmail: "sarah@example.com",
		customerPhone: "0723456789",
		subject: "Wrong item delivered",
		description: "I ordered a phone but received a different model. The IMEI number doesn't match what I ordered.",
		category: "shipping",
		priority: "urgent",
		status: "open",
		createdAt: "2024-08-24",
		updatedAt: "2024-08-24",
	},
	{
		id: "tkt-3",
		customerName: "Mike Omondi",
		customerEmail: "mike@example.com",
		customerPhone: "0734567890",
		subject: "Refund not processed",
		description: "I returned an item 2 weeks ago but haven't received my refund yet. Order number: EB-20240810-123",
		category: "billing",
		priority: "high",
		status: "waiting_customer",
		createdAt: "2024-08-23",
		updatedAt: "2024-08-24",
		assignedTo: "Billing Team",
	},
	{
		id: "tkt-4",
		customerName: "Jane Wambui",
		customerEmail: "jane@example.com",
		customerPhone: "0745678901",
		subject: "Question about warranty",
		description: "Does the product come with international warranty? I'll be traveling abroad next month.",
		category: "product",
		priority: "low",
		status: "resolved",
		createdAt: "2024-08-22",
		updatedAt: "2024-08-23",
		assignedTo: "Support Team B",
	},
	{
		id: "tkt-5",
		customerName: "Brian Kipchoge",
		customerEmail: "brian@example.com",
		customerPhone: "0756789012",
		subject: "Coupon code not working",
		description: "I'm trying to apply the SUMMER25 coupon but it says it's expired. Can you help?",
		category: "other",
		priority: "medium",
		status: "closed",
		createdAt: "2024-08-21",
		updatedAt: "2024-08-22",
		assignedTo: "Support Team A",
	},
]

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

	const filteredTickets = mockTickets.filter((ticket) => {
		const matchesSearch =
			ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
			ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" ||
			ticket.status.toLowerCase().replace("_", " ") === statusFilter.toLowerCase()
		const matchesPriority =
			priorityFilter === "All" ||
			ticket.priority.toLowerCase() === priorityFilter.toLowerCase()
		const matchesCategory =
			categoryFilter === "All" ||
			ticket.category.toLowerCase() === categoryFilter.toLowerCase()
		return matchesSearch && matchesStatus && matchesPriority && matchesCategory
	})

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

	const getCategoryIcon = (category: string) => {
		const icons: Record<string, React.ElementType> = {
			technical: AlertTriangle,
			billing: Mail,
			shipping: Package,
			product: Ticket,
			other: MessageSquare,
		}
		return icons[category] || MessageSquare
	}

	const ticketStats = {
		total: mockTickets.length,
		open: mockTickets.filter((t) => t.status === "open").length,
		inProgress: mockTickets.filter((t) => t.status === "in_progress").length,
		waiting: mockTickets.filter((t) => t.status === "waiting_customer").length,
		resolved: mockTickets.filter((t) => t.status === "resolved").length,
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
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{
						label: "Total Tickets",
						value: ticketStats.total.toString(),
						icon: Ticket,
						color: "text-blue-500",
					},
					{
						label: "Open",
						value: ticketStats.open.toString(),
						icon: AlertTriangle,
						color: "text-red-500",
					},
					{
						label: "In Progress",
						value: ticketStats.inProgress.toString(),
						icon: Clock,
						color: "text-yellow-500",
					},
					{
						label: "Resolved",
						value: ticketStats.resolved.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
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
						{priorityFilters.map((filter) => (
							<button
								key={filter}
								onClick={() => setPriorityFilter(filter)}
								className={clsx(
									"px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
									priorityFilter === filter
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

			{/* Tickets List */}
			<div className="space-y-4">
				{filteredTickets.map((ticket, index) => {
					const CategoryIcon = getCategoryIcon(ticket.category)
					return (
						<motion.div
							key={ticket.id}
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

								{/* Ticket Content */}
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between mb-2">
										<div>
											<h3 className="font-semibold text-sm mb-1">{ticket.subject}</h3>
											<p className="text-xs text-gray-500">
												{ticket.id} • {ticket.customerName} • {ticket.createdAt}
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
											<span className="capitalize">{ticket.category}</span>
											{ticket.assignedTo && (
												<span>Assigned to: {ticket.assignedTo}</span>
											)}
										</div>

										<div className="flex items-center gap-1">
											<button
												onClick={() => {
													setSelectedTicket(ticket)
													setShowDetails(true)
												}}
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="View Details"
											>
												<Eye size={16} />
											</button>
											<button
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="Reply"
											>
												<MessageSquare size={16} />
											</button>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)
				})}
			</div>

			{filteredTickets.length === 0 && (
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
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto"
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
											<span
												className={clsx(
													"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
													getStatusBadge(selectedTicket.status),
												)}
											>
												{getStatusIcon(selectedTicket.status)}
												{selectedTicket.status.replace("_", " ").toUpperCase()}
											</span>
										</div>
										<p className="text-xs text-gray-500">
											{selectedTicket.id} • Created {selectedTicket.createdAt}
										</p>
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
											<div className="flex items-center gap-2">
												<Phone size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Phone</p>
													<p className="text-sm font-medium">{selectedTicket.customerPhone}</p>
												</div>
											</div>
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
										<div className="grid grid-cols-2 gap-4">
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-xs text-gray-500">Category</p>
												<p className="text-sm font-medium capitalize">{selectedTicket.category}</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-xs text-gray-500">Priority</p>
												<p className="text-sm font-medium capitalize">{selectedTicket.priority}</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-xs text-gray-500">Assigned To</p>
												<p className="text-sm font-medium">{selectedTicket.assignedTo || "Unassigned"}</p>
											</div>
											<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
												<p className="text-xs text-gray-500">Last Updated</p>
												<p className="text-sm font-medium">{selectedTicket.updatedAt}</p>
											</div>
										</div>
									</div>

									{/* Actions */}
									<div className="flex gap-3">
										<button className="btn-primary flex-1">Reply to Ticket</button>
										<button className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition">
											Change Status
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