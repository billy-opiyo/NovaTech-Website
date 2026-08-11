"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import {
	TrendingUp,
	ShoppingCart,
	Users,
	DollarSign,
	Package,
	ArrowUpRight,
	ArrowDownRight,
	Eye,
	MoreVertical,
	Star,
	AlertCircle,
	CheckCircle2,
	Clock,
	 Truck,
} from "lucide-react"
import clsx from "clsx"

interface StatCard {
	label: string
	value: string
	change: string
	changeType: "positive" | "negative"
	icon: React.ElementType
	color: string
	bgColor: string
}

interface RecentOrder {
	id: string
	customer: string
	product: string
	amount: number
	status: "completed" | "processing" | "pending" | "cancelled"
	date: string
	image: string
}

interface TopProduct {
	id: string
	name: string
	sales: number
	revenue: number
	image: string
	rating: number
}

const statsCards: StatCard[] = [
	{
		label: "Total Revenue",
		value: "KES 2.4M",
		change: "+12.5%",
		changeType: "positive",
		icon: DollarSign,
		color: "text-green-500",
		bgColor: "bg-green-500/10",
	},
	{
		label: "Total Orders",
		value: "1,245",
		change: "+8.2%",
		changeType: "positive",
		icon: ShoppingCart,
		color: "text-blue-500",
		bgColor: "bg-blue-500/10",
	},
	{
		label: "Total Customers",
		value: "856",
		change: "+23.1%",
		changeType: "positive",
		icon: Users,
		color: "text-purple-500",
		bgColor: "bg-purple-500/10",
	},
	{
		label: "Products Sold",
		value: "3,456",
		change: "-2.4%",
		changeType: "negative",
		icon: Package,
		color: "text-orange-500",
		bgColor: "bg-orange-500/10",
	},
]

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

const topProducts: TopProduct[] = [
	{
		id: "1",
		name: "iPhone 15 Pro Max",
		sales: 145,
		revenue: 23249855,
		image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=100&q=80",
		rating: 4.8,
	},
	{
		id: "2",
		name: "MacBook Air M3",
		sales: 89,
		revenue: 16929911,
		image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=100&q=80",
		rating: 4.9,
	},
	{
		id: "3",
		name: "Samsung Galaxy S24 Ultra",
		sales: 112,
		revenue: 15119888,
		image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=100&q=80",
		rating: 4.7,
	},
	{
		id: "4",
		name: "Sony WH-1000XM5",
		sales: 67,
		revenue: 2344933,
		image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=100&q=80",
		rating: 4.6,
	},
]

const orderStatusStats = [
	{ label: "Completed", count: 980, percentage: 78.7, color: "bg-green-500" },
	{ label: "Processing", count: 145, percentage: 11.6, color: "bg-blue-500" },
	{ label: "Pending", count: 67, percentage: 5.4, color: "bg-yellow-500" },
	{ label: "Cancelled", count: 53, percentage: 4.3, color: "bg-red-500" },
]

export default function AdminDashboardPage() {
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

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
					<p className="text-gray-500 mt-1">Welcome back, Admin! Here's what's happening.</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Eye size={18} /> View Store
					</button>
					<button className="btn-primary flex items-center gap-2">
						<TrendingUp size={18} /> Generate Report
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{statsCards.map((stat, index) => (
					<motion.div
						key={stat.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
						className="glass-card p-6 hover:scale-105 transition-transform cursor-pointer"
					>
						<div className="flex items-start justify-between mb-4">
							<div className={clsx("p-3 rounded-xl", stat.bgColor)}>
								<stat.icon className={stat.color} size={24} />
							</div>
							<div
								className={clsx(
									"flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg",
									stat.changeType === "positive"
										? "text-green-600 bg-green-500/10"
										: "text-red-600 bg-red-500/10",
								)}
							>
								{stat.changeType === "positive" ? (
									<ArrowUpRight size={16} />
								) : (
									<ArrowDownRight size={16} />
								)}
								{stat.change}
							</div>
						</div>
						<p className="text-3xl font-bold mb-1">{stat.value}</p>
						<p className="text-sm text-gray-500">{stat.label}</p>
					</motion.div>
				))}
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Sales Chart */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="lg:col-span-2 glass-card p-6"
				>
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-xl font-bold">Sales Overview</h2>
							<p className="text-sm text-gray-500 mt-1">Revenue for the last 7 days</p>
						</div>
						<select className="form-select form-select-sm">
							<option>Last 7 days</option>
							<option>Last 30 days</option>
							<option>Last 3 months</option>
							<option>Last year</option>
						</select>
					</div>
					<div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
						<div className="text-center">
							<TrendingUp className="mx-auto mb-2 text-gray-400" size={48} />
							<p className="text-gray-500">Chart visualization would go here</p>
							<p className="text-sm text-gray-400">Integrate with Chart.js or Recharts</p>
						</div>
					</div>
				</motion.div>

				{/* Order Status */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="glass-card p-6"
				>
					<h2 className="text-xl font-bold mb-6">Order Status</h2>
					<div className="space-y-4">
						{orderStatusStats.map((status, index) => (
							<div key={status.label}>
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">{status.label}</span>
									<span className="text-sm text-gray-500">{status.count}</span>
								</div>
								<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${status.percentage}%` }}
										transition={{ duration: 1, delay: index * 0.1 }}
										className={clsx("h-2 rounded-full", status.color)}
									/>
								</div>
							</div>
						))}
					</div>
					<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-500">Total Orders</span>
							<span className="text-lg font-bold">1,245</span>
						</div>
					</div>
				</motion.div>
			</div>

			{/* Bottom Row */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Recent Orders */}
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
									<p className="text-xs text-gray-500">{order.customer} • {order.date}</p>
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

				{/* Top Products */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.7 }}
					className="glass-card p-6"
				>
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-xl font-bold">Top Products</h2>
							<p className="text-sm text-gray-500 mt-1">Best sellers this month</p>
						</div>
					</div>
					<div className="space-y-4">
						{topProducts.map((product, index) => (
							<motion.div
								key={product.id}
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.7 + index * 0.05 }}
								className="flex items-center gap-4"
							>
								<div className="relative h-16 w-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
									<Image
										src={product.image}
										alt={product.name}
										fill
										className="object-cover"
									/>
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm truncate">{product.name}</p>
									<div className="flex items-center gap-2 mt-1">
										<div className="flex items-center gap-1">
											<Star
												size={12}
												className="text-yellow-500 fill-yellow-500"
											/>
											<span className="text-xs text-gray-500">{product.rating}</span>
										</div>
										<span className="text-xs text-gray-400">
											{product.sales} sales
										</span>
									</div>
									<p className="text-sm font-semibold text-green-600 mt-1">
										KES {(product.revenue / 1000000).toFixed(2)}M
									</p>
								</div>
							</motion.div>
						))}
					</div>
					<button className="w-full mt-4 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm">
						View All Products
					</button>
				</motion.div>
			</div>

			{/* Quick Actions */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.8 }}
				className="glass-card p-6"
			>
				<h2 className="text-xl font-bold mb-4">Quick Actions</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{[
						{ label: "Add Product", icon: Package, href: "/admin/products" },
						{ label: "View Orders", icon: ShoppingCart, href: "/admin/orders" },
						{ label: "Manage Customers", icon: Users, href: "/admin/customers" },
						{ label: "View Analytics", icon: TrendingUp, href: "/admin/analytics" },
					].map((action, index) => (
						<a
							key={action.label}
							href={action.href}
							className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition"
						>
							<action.icon size={28} className="text-primary" />
							<span className="text-sm font-medium">{action.label}</span>
						</a>
					))}
				</div>
			</motion.div>
		</div>
	)
}