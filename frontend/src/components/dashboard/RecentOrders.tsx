"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { AlertCircle, CheckCircle2, Clock, Truck } from "lucide-react"
import clsx from "clsx"

interface RecentOrder {
	id: string
	customer: string
	product: string
	amount: number
	status: "completed" | "processing" | "pending" | "cancelled"
	date: string
	image: string
}

const recentOrders: RecentOrder[] = [
	{
		id: "EB-20240824-005",
		customer: "Brian K.",
		product: "MacBook Air M3",
		amount: 189999,
		status: "completed",
		date: "2 min ago",
		image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=100&q=80",
	},
	{
		id: "EB-20240824-004",
		customer: "Sarah M.",
		product: "iPhone 15 Pro Max",
		amount: 159999,
		status: "processing",
		date: "15 min ago",
		image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=100&q=80",
	},
	{
		id: "EB-20240824-003",
		customer: "John D.",
		product: "Samsung Galaxy S24",
		amount: 134999,
		status: "pending",
		date: "1 hour ago",
		image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=100&q=80",
	},
	{
		id: "EB-20240824-002",
		customer: "Jane W.",
		product: "Sony WH-1000XM5",
		amount: 34999,
		status: "completed",
		date: "3 hours ago",
		image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=100&q=80",
	},
	{
		id: "EB-20240824-001",
		customer: "Mike O.",
		product: "Dell XPS 15",
		amount: 159999,
		status: "cancelled",
		date: "5 hours ago",
		image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=100&q=80",
	},
]

const getStatusBadge = (status: string) => {
	const styles: Record<string, string> = {
		completed: "bg-green-500/20 text-green-600",
		processing: "bg-blue-500/20 text-blue-600",
		pending: "bg-yellow-500/20 text-yellow-600",
		cancelled: "bg-red-500/20 text-red-600",
	}
	return styles[status] || "bg-gray-500/20 text-gray-600"
}

const getStatusIcon = (status: string) => {
	const icons: Record<string, React.ReactNode> = {
		completed: <CheckCircle2 size={14} />,
		processing: <Clock size={14} />,
		pending: <AlertCircle size={14} />,
		cancelled: <Truck size={14} />,
	}
	return icons[status] || null
}

export default function RecentOrders() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.6 }}
			className="lg:col-span-2 glass-card p-6"
		>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-bold">Recent Orders</h2>
					<p className="text-sm text-gray-500 mt-1">Latest transactions</p>
				</div>
				<button className="text-sm text-primary hover:underline">View All</button>
			</div>
			<div className="space-y-4">
				{recentOrders.map((order, index) => (
					<motion.div
						key={order.id}
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.6 + index * 0.05 }}
						className="flex items-center gap-4 p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
					>
						<div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
							<Image
								src={order.image}
								alt={order.product}
								fill
								className="object-cover"
							/>
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-sm truncate">{order.product}</p>
							<p className="text-xs text-gray-500">
								{order.customer} • {order.date}
							</p>
						</div>
						<div className="text-right flex-shrink-0">
							<p className="font-semibold text-sm">
								KES {order.amount.toLocaleString()}
							</p>
							<span
								className={clsx(
									"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
									getStatusBadge(order.status),
								)}
							>
								{getStatusIcon(order.status)}
								{order.status.charAt(0).toUpperCase() + order.status.slice(1)}
							</span>
						</div>
					</motion.div>
				))}
			</div>
		</motion.div>
	)
}