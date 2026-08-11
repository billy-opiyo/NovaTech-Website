"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Mail,
	Search,
	Filter,
	Eye,
	Trash2,
	CheckCircle2,
	XCircle,
	Archive,
	Download,
	Phone,
	Calendar,
	MessageSquare,
} from "lucide-react"
import clsx from "clsx"

interface ContactMessage {
	id: string
	name: string
	email: string
	phone: string
	subject: string
	message: string
	status: "unread" | "read" | "replied" | "archived"
	createdAt: string
}

const mockMessages: ContactMessage[] = [
	{
		id: "msg-1",
		name: "John Doe",
		email: "john@example.com",
		phone: "0712345678",
		subject: "Partnership Inquiry",
		message: "I'm interested in becoming a distributor for your products. Could you provide more information about wholesale pricing?",
		status: "unread",
		createdAt: "2024-08-24",
	},
	{
		id: "msg-2",
		name: "Sarah Kimani",
		email: "sarah@example.com",
		phone: "0723456789",
		subject: "Product Feedback",
		message: "I recently purchased the iPhone 15 and I'm very impressed with the quality. However, I think you should add more color options.",
		status: "read",
		createdAt: "2024-08-23",
	},
	{
		id: "msg-3",
		name: "Mike Omondi",
		email: "mike@example.com",
		phone: "0734567890",
		subject: "Bulk Order Request",
		message: "Our company needs 50 laptops for our office. Can you offer a corporate discount and delivery to Kisumu?",
		status: "replied",
		createdAt: "2024-08-22",
	},
	{
		id: "msg-4",
		name: "Jane Wambui",
		email: "jane@example.com",
		phone: "0745678901",
		subject: "Website Suggestion",
		message: "It would be great if you could add a comparison feature for products. Also, consider adding EMI options for high-value purchases.",
		status: "archived",
		createdAt: "2024-08-21",
	},
]

const statusFilters = ["All", "Unread", "Read", "Replied", "Archived"]

export default function AdminMessagesPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const filteredMessages = mockMessages.filter((message) => {
		const matchesSearch =
			message.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			message.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
			message.message.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" ||
			message.status.toLowerCase() === statusFilter.toLowerCase()
		return matchesSearch && matchesStatus
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			unread: "bg-blue-500/20 text-blue-600",
			read: "bg-gray-500/20 text-gray-600",
			replied: "bg-green-500/20 text-green-600",
			archived: "bg-yellow-500/20 text-yellow-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			unread: <Mail size={14} />,
			read: <CheckCircle2 size={14} />,
			replied: <MessageSquare size={14} />,
			archived: <Archive size={14} />,
		}
		return icons[status] || null
	}

	const messageStats = {
		total: mockMessages.length,
		unread: mockMessages.filter((m) => m.status === "unread").length,
		read: mockMessages.filter((m) => m.status === "read").length,
		replied: mockMessages.filter((m) => m.status === "replied").length,
		archived: mockMessages.filter((m) => m.status === "archived").length,
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Messages</h1>
					<p className="text-gray-500 mt-1">Contact form submissions and messages</p>
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
						label: "Total Messages",
						value: messageStats.total.toString(),
						icon: MessageSquare,
						color: "text-blue-500",
					},
					{
						label: "Unread",
						value: messageStats.unread.toString(),
						icon: Mail,
						color: "text-orange-500",
					},
					{
						label: "Replied",
						value: messageStats.replied.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "Archived",
						value: messageStats.archived.toString(),
						icon: Archive,
						color: "text-gray-500",
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
							placeholder="Search messages by name, email, subject, or content..."
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

			{/* Messages List */}
			<div className="space-y-4">
				{filteredMessages.map((message, index) => (
					<motion.div
						key={message.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05 }}
						className="glass-card p-6 hover:scale-[1.01] transition cursor-pointer"
					>
						<div className="flex items-start gap-4">
							{/* Avatar */}
							<div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
								<Mail className="text-gray-400" size={20} />
							</div>

							{/* Message Content */}
							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between mb-2">
									<div>
										<h3 className="font-semibold text-sm mb-1">{message.subject}</h3>
										<div className="flex items-center gap-2">
											<p className="text-sm font-medium">{message.name}</p>
											<span className="text-xs text-gray-500">•</span>
											<p className="text-xs text-gray-500">{message.email}</p>
										</div>
									</div>
									<span
										className={clsx(
											"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
											getStatusBadge(message.status),
										)}
									>
										{getStatusIcon(message.status)}
										{message.status.toUpperCase()}
									</span>
								</div>

								<p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
									{message.message}
								</p>

								<div className="flex items-center justify-between">
									<div className="flex items-center gap-4 text-xs text-gray-500">
										<span>{message.id}</span>
										<span>•</span>
										<span>{message.createdAt}</span>
									</div>

									<div className="flex items-center gap-1">
										<button
											onClick={() => {
												setSelectedMessage(message)
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
										<button
											className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
											title="Archive"
										>
											<Archive size={16} />
										</button>
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{filteredMessages.length === 0 && (
				<div className="text-center py-16">
					<Mail className="mx-auto mb-4 text-gray-400" size={48} />
					<h3 className="text-lg font-semibold mb-2">No messages found</h3>
					<p className="text-gray-500">Try adjusting your search or filters</p>
				</div>
			)}

			{/* Message Details Modal */}
			<AnimatePresence>
				{showDetails && selectedMessage && (
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
									<h2 className="text-xl font-bold">Message Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Subject & Status */}
									<div>
										<div className="flex items-start justify-between mb-2">
											<h3 className="font-semibold text-lg">{selectedMessage.subject}</h3>
											<span
												className={clsx(
													"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
													getStatusBadge(selectedMessage.status),
												)}
											>
												{getStatusIcon(selectedMessage.status)}
												{selectedMessage.status.toUpperCase()}
											</span>
										</div>
										<p className="text-xs text-gray-500">
											{selectedMessage.id} • Received {selectedMessage.createdAt}
										</p>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Sender Info */}
									<div>
										<h3 className="font-semibold mb-3">Sender Information</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="flex items-center gap-2">
												<Users size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Name</p>
													<p className="text-sm font-medium">{selectedMessage.name}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Mail size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Email</p>
													<p className="text-sm font-medium">{selectedMessage.email}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Phone size={18} className="text-gray-400" />
												<div>
													<p className="text-xs text-gray-500">Phone</p>
													<p className="text-sm font-medium">{selectedMessage.phone}</p>
												</div>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Message Content */}
									<div>
										<h3 className="font-semibold mb-3">Message</h3>
										<p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
											{selectedMessage.message}
										</p>
									</div>

									{/* Actions */}
									<div className="flex gap-3">
										<button className="btn-primary flex-1">Reply via Email</button>
										<button className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition">
											Mark as {selectedMessage.status === "unread" ? "Read" : "Unread"}
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