"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
	Star,
	Search,
	Filter,
	Eye,
	Trash2,
	CheckCircle2,
	XCircle,
	Flag,
	MessageSquare,
	ThumbsUp,
	ThumbsDown,
	MoreVertical,
	Download,
	Clock,
} from "lucide-react"
import clsx from "clsx"

interface Review {
	id: string
	customerName: string
	customerAvatar: string
	productName: string
	productImage: string
	rating: number
	comment: string
	date: string
	status: "pending" | "approved" | "rejected" | "flagged"
	helpful: number
	notHelpful: number
	verified: boolean
}

const mockReviews: Review[] = [
	{
		id: "rev-1",
		customerName: "John Doe",
		customerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
		productName: "iPhone 15 Pro Max",
		productImage: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=100&q=80",
		rating: 5,
		comment: "Amazing phone! The camera quality is outstanding and the battery life is incredible. Best purchase I've made this year.",
		date: "2024-08-24",
		status: "approved",
		helpful: 24,
		notHelpful: 2,
		verified: true,
	},
	{
		id: "rev-2",
		customerName: "Sarah Kimani",
		customerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
		productName: "MacBook Air M3",
		productImage: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=100&q=80",
		rating: 4,
		comment: "Great laptop for everyday use. Very lightweight and the performance is smooth. Would recommend for students.",
		date: "2024-08-23",
		status: "approved",
		helpful: 18,
		notHelpful: 1,
		verified: true,
	},
	{
		id: "rev-3",
		customerName: "Mike Omondi",
		customerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
		productName: "Samsung Galaxy S24 Ultra",
		productImage: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=100&q=80",
		rating: 2,
		comment: "The phone overheats during gaming sessions. Expected better quality for this price point.",
		date: "2024-08-22",
		status: "pending",
		helpful: 5,
		notHelpful: 12,
		verified: true,
	},
	{
		id: "rev-4",
		customerName: "Jane Wambui",
		customerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80",
		productName: "Sony WH-1000XM5",
		productImage: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=100&q=80",
		rating: 5,
		comment: "Best noise-canceling headphones I've ever used. Perfect for work from home!",
		date: "2024-08-21",
		status: "approved",
		helpful: 31,
		notHelpful: 0,
		verified: true,
	},
	{
		id: "rev-5",
		customerName: "Brian Kipchoge",
		customerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
		productName: "Dell XPS 15",
		productImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=100&q=80",
		rating: 1,
		comment: "Terrible experience. The laptop arrived with a defective screen. Customer service was unhelpful.",
		date: "2024-08-20",
		status: "flagged",
		helpful: 8,
		notHelpful: 3,
		verified: false,
	},
]

const statusFilters = ["All", "Pending", "Approved", "Rejected", "Flagged"]

export default function AdminReviewsPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")
	const [selectedReview, setSelectedReview] = useState<Review | null>(null)
	const [showDetails, setShowDetails] = useState(false)

	const filteredReviews = mockReviews.filter((review) => {
		const matchesSearch =
			review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			review.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			review.comment.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" ||
			review.status.toLowerCase() === statusFilter.toLowerCase()
		return matchesSearch && matchesStatus
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			pending: "bg-yellow-500/20 text-yellow-600",
			approved: "bg-green-500/20 text-green-600",
			rejected: "bg-red-500/20 text-red-600",
			flagged: "bg-orange-500/20 text-orange-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			pending: <Clock size={14} />,
			approved: <CheckCircle2 size={14} />,
			rejected: <XCircle size={14} />,
			flagged: <Flag size={14} />,
		}
		return icons[status] || null
	}

	const renderStars = (rating: number) => {
		return (
			<div className="flex items-center gap-1">
				{[...Array(5)].map((_, i) => (
					<Star
						key={i}
						size={14}
						className={i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
					/>
				))}
			</div>
		)
	}

	const reviewStats = {
		total: mockReviews.length,
		pending: mockReviews.filter((r) => r.status === "pending").length,
		approved: mockReviews.filter((r) => r.status === "approved").length,
		flagged: mockReviews.filter((r) => r.status === "flagged").length,
		averageRating: (mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length).toFixed(1),
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Reviews</h1>
					<p className="text-gray-500 mt-1">Moderate and manage customer reviews</p>
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
						label: "Total Reviews",
						value: reviewStats.total.toString(),
						icon: MessageSquare,
						color: "text-blue-500",
					},
					{
						label: "Pending",
						value: reviewStats.pending.toString(),
						icon: Clock,
						color: "text-yellow-500",
					},
					{
						label: "Approved",
						value: reviewStats.approved.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "Avg Rating",
						value: reviewStats.averageRating,
						icon: Star,
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
							placeholder="Search reviews by product, customer, or comment..."
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

			{/* Reviews List */}
			<div className="space-y-4">
				{filteredReviews.map((review, index) => (
					<motion.div
						key={review.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05 }}
						className="glass-card p-6 hover:scale-[1.01] transition cursor-pointer"
					>
						<div className="flex gap-4">
							{/* Product Image */}
							<div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
								<Image
									src={review.productImage}
									alt={review.productName}
									fill
									className="object-cover"
								/>
							</div>

							{/* Review Content */}
							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between mb-2">
									<div>
										<h3 className="font-semibold text-sm mb-1">{review.productName}</h3>
										<div className="flex items-center gap-2">
											{renderStars(review.rating)}
											<span className="text-xs text-gray-500">{review.rating}.0</span>
											{review.verified && (
												<span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">
													Verified Purchase
												</span>
											)}
										</div>
									</div>
									<span
										className={clsx(
											"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
											getStatusBadge(review.status),
										)}
									>
										{getStatusIcon(review.status)}
										{review.status.toUpperCase()}
									</span>
								</div>

								<p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
									{review.comment}
								</p>

								<div className="flex items-center justify-between">
									<div className="flex items-center gap-4">
										<div className="flex items-center gap-2">
											<div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
												<Image
													src={review.customerAvatar}
													alt={review.customerName}
													fill
													className="object-cover"
												/>
											</div>
											<div>
												<p className="text-xs font-medium">{review.customerName}</p>
												<p className="text-xs text-gray-500">{review.date}</p>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-4">
										<div className="flex items-center gap-3 text-xs text-gray-500">
											<div className="flex items-center gap-1">
												<ThumbsUp size={14} />
												<span>{review.helpful}</span>
											</div>
											<div className="flex items-center gap-1">
												<ThumbsDown size={14} />
												<span>{review.notHelpful}</span>
											</div>
										</div>

										<div className="flex items-center gap-1">
											<button
												onClick={() => {
													setSelectedReview(review)
													setShowDetails(true)
												}}
												className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
												title="View Details"
											>
												<Eye size={16} />
											</button>
											{review.status === "pending" && (
												<>
													<button
														className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-green-500 transition"
														title="Approve"
													>
														<CheckCircle2 size={16} />
													</button>
													<button
														className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition"
														title="Reject"
													>
														<XCircle size={16} />
													</button>
												</>
											)}
											{review.status === "flagged" && (
												<button
													className="p-2 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/20 text-orange-500 transition"
													title="Take Action"
												>
													<Flag size={16} />
												</button>
											)}
											<button
												className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition"
												title="Delete"
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{filteredReviews.length === 0 && (
				<div className="text-center py-16">
					<MessageSquare className="mx-auto mb-4 text-gray-400" size={48} />
					<h3 className="text-lg font-semibold mb-2">No reviews found</h3>
					<p className="text-gray-500">Try adjusting your search or filters</p>
				</div>
			)}

			{/* Review Details Modal */}
			<AnimatePresence>
				{showDetails && selectedReview && (
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
									<h2 className="text-xl font-bold">Review Details</h2>
									<button onClick={() => setShowDetails(false)}>
										<XCircle size={24} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Product Info */}
									<div className="flex items-center gap-4">
										<div className="relative h-24 w-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
											<Image
												src={selectedReview.productImage}
												alt={selectedReview.productName}
												fill
												className="object-cover"
											/>
										</div>
										<div>
											<h3 className="font-semibold text-lg">{selectedReview.productName}</h3>
											<div className="flex items-center gap-2 mt-1">
												{renderStars(selectedReview.rating)}
												<span className="text-sm text-gray-500">{selectedReview.rating}.0</span>
											</div>
											<span
												className={clsx(
													"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2",
													getStatusBadge(selectedReview.status),
												)}
											>
												{getStatusIcon(selectedReview.status)}
												{selectedReview.status.toUpperCase()}
											</span>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Customer Info */}
									<div>
										<h3 className="font-semibold mb-3">Customer Information</h3>
										<div className="flex items-center gap-3">
											<div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
												<Image
													src={selectedReview.customerAvatar}
													alt={selectedReview.customerName}
													fill
													className="object-cover"
												/>
											</div>
											<div>
												<p className="font-medium">{selectedReview.customerName}</p>
												<p className="text-sm text-gray-500">Reviewed on {selectedReview.date}</p>
											</div>
										</div>
									</div>

									<hr className="border-gray-200 dark:border-gray-700" />

									{/* Review Comment */}
									<div>
										<h3 className="font-semibold mb-3">Review</h3>
										<p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
											{selectedReview.comment}
										</p>
									</div>

									{/* Feedback Stats */}
									<div className="grid grid-cols-2 gap-4">
										<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
											<div className="flex items-center gap-2">
												<ThumbsUp size={20} className="text-green-500" />
												<div>
													<p className="text-xl font-bold">{selectedReview.helpful}</p>
													<p className="text-xs text-gray-500">Found Helpful</p>
												</div>
											</div>
										</div>
										<div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
											<div className="flex items-center gap-2">
												<ThumbsDown size={20} className="text-red-500" />
												<div>
													<p className="text-xl font-bold">{selectedReview.notHelpful}</p>
													<p className="text-xs text-gray-500">Not Helpful</p>
												</div>
											</div>
										</div>
									</div>

									{/* Actions */}
									{selectedReview.status === "pending" && (
										<div className="flex gap-3">
											<button className="btn-primary flex-1">Approve Review</button>
											<button className="flex-1 px-4 py-2 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition">
												Reject Review
											</button>
										</div>
									)}
									{selectedReview.status === "flagged" && (
										<div className="flex gap-3">
											<button className="btn-primary flex-1">Remove Flag</button>
											<button className="flex-1 px-4 py-2 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition">
												Delete Review
											</button>
										</div>
									)}
									<button
										onClick={() => setShowDetails(false)}
										className="w-full px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
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