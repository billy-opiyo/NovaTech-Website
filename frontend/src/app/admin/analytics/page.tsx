"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import {
	TrendingUp,
	TrendingDown,
	DollarSign,
	ShoppingCart,
	Users,
	Package,
	ArrowUpRight,
	ArrowDownRight,
	Calendar,
	Download,
	Filter,
} from "lucide-react"
import clsx from "clsx"

interface MetricCard {
	title: string
	value: string
	change: string
	changeType: "positive" | "negative"
	icon: React.ElementType
	color: string
	bgColor: string
}

interface SalesData {
	period: string
	revenue: number
	orders: number
}

interface CategorySales {
	category: string
	sales: number
	percentage: number
	color: string
}

interface TopProduct {
	id: string
	name: string
	category: string
	sales: number
	revenue: number
	image: string
	growth: number
}

const metricsCards: MetricCard[] = [
	{
		title: "Total Revenue",
		value: "KES 2,847,350",
		change: "+12.5%",
		changeType: "positive",
		icon: DollarSign,
		color: "text-green-500",
		bgColor: "bg-green-500/10",
	},
	{
		title: "Total Orders",
		value: "1,845",
		change: "+8.2%",
		changeType: "positive",
		icon: ShoppingCart,
		color: "text-blue-500",
		bgColor: "bg-blue-500/10",
	},
	{
		title: "Average Order Value",
		value: "KES 1,543",
		change: "+5.1%",
		changeType: "positive",
		icon: TrendingUp,
		color: "text-purple-500",
		bgColor: "bg-purple-500/10",
	},
	{
		title: "Conversion Rate",
		value: "3.24%",
		change: "-0.4%",
		changeType: "negative",
		icon: Users,
		color: "text-orange-500",
		bgColor: "bg-orange-500/10",
	},
]

const salesData: SalesData[] = [
	{ period: "Mon", revenue: 425000, orders: 120 },
	{ period: "Tue", revenue: 389000, orders: 115 },
	{ period: "Wed", revenue: 512000, orders: 145 },
	{ period: "Thu", revenue: 478000, orders: 132 },
	{ period: "Fri", revenue: 623000, orders: 178 },
	{ period: "Sat", revenue: 567000, orders: 165 },
	{ period: "Sun", revenue: 410000, orders: 118 },
]

const categorySales: CategorySales[] = [
	{ category: "Phones", sales: 892450, percentage: 38, color: "bg-blue-500" },
	{ category: "Laptops", sales: 654200, percentage: 28, color: "bg-green-500" },
	{ category: "Tablets", sales: 312800, percentage: 13, color: "bg-yellow-500" },
	{ category: "Accessories", sales: 489600, percentage: 21, color: "bg-purple-500" },
]

const topProducts: TopProduct[] = [
	{
		id: "1",
		name: "iPhone 15 Pro Max",
		category: "Phones",
		sales: 145,
		revenue: 23249855,
		image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=100&q=80",
		growth: 12.5,
	},
	{
		id: "2",
		name: "MacBook Air M3",
		category: "Laptops",
		sales: 89,
		revenue: 16929911,
		image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=100&q=80",
		growth: 8.3,
	},
	{
		id: "3",
		name: "Samsung Galaxy S24 Ultra",
		category: "Phones",
		sales: 112,
		revenue: 15119888,
		image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=100&q=80",
		growth: 15.7,
	},
	{
		id: "4",
		name: "Sony WH-1000XM5",
		category: "Accessories",
		sales: 67,
		revenue: 2344933,
		image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=100&q=80",
		growth: -3.2,
	},
	{
		id: "5",
		name: "iPad Pro 12.9",
		category: "Tablets",
		sales: 54,
		revenue: 13499946,
		image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=100&q=80",
		growth: 5.8,
	},
]

export default function AdminAnalyticsPage() {
	const [timeRange, setTimeRange] = useState("7d")
	const [selectedMetric, setSelectedMetric] = useState("revenue")

	const maxRevenue = Math.max(...salesData.map((d) => d.revenue))
	const maxOrders = Math.max(...salesData.map((d) => d.orders))

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
					<p className="text-gray-500 mt-1">Track your store performance and insights</p>
				</div>
				<div className="flex gap-3">
					<select
						value={timeRange}
						onChange={(e) => setTimeRange(e.target.value)}
						className="form-select"
					>
						<option value="7d">Last 7 days</option>
						<option value="30d">Last 30 days</option>
						<option value="3m">Last 3 months</option>
						<option value="1y">Last year</option>
					</select>
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export
					</button>
				</div>
			</div>

			{/* Metrics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{metricsCards.map((metric, index) => (
					<motion.div
						key={metric.title}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
						className="glass-card p-6 hover:scale-105 transition-transform cursor-pointer"
					>
						<div className="flex items-start justify-between mb-4">
							<div className={clsx("p-3 rounded-xl", metric.bgColor)}>
								<metric.icon className={metric.color} size={24} />
							</div>
							<div
								className={clsx(
									"flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg",
									metric.changeType === "positive"
										? "text-green-600 bg-green-500/10"
										: "text-red-600 bg-red-500/10",
								)}
							>
								{metric.changeType === "positive" ? (
									<ArrowUpRight size={16} />
								) : (
									<ArrowDownRight size={16} />
								)}
								{metric.change}
							</div>
						</div>
						<p className="text-2xl font-bold mb-1">{metric.value}</p>
						<p className="text-sm text-gray-500">{metric.title}</p>
					</motion.div>
				))}
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Revenue Chart */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="glass-card p-6"
				>
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-xl font-bold">Revenue Overview</h2>
							<p className="text-sm text-gray-500 mt-1">Daily revenue for the period</p>
						</div>
					</div>
					<div className="h-64 flex items-end gap-2">
						{salesData.map((data, index) => (
							<div key={data.period} className="flex-1 flex flex-col items-center gap-2">
								<motion.div
									initial={{ height: 0 }}
									animate={{ height: `${(data.revenue / maxRevenue) * 100}%` }}
									transition={{ duration: 1, delay: index * 0.1 }}
									className="w-full bg-gradient-to-t from-primary to-accent rounded-t-lg relative group cursor-pointer"
								>
									<div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
										KES {(data.revenue / 1000000).toFixed(2)}M
									</div>
								</motion.div>
								<span className="text-xs text-gray-500">{data.period}</span>
							</div>
						))}
					</div>
				</motion.div>

				{/* Orders Chart */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="glass-card p-6"
				>
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-xl font-bold">Orders Overview</h2>
							<p className="text-sm text-gray-500 mt-1">Daily orders for the period</p>
						</div>
					</div>
					<div className="h-64 flex items-end gap-2">
						{salesData.map((data, index) => (
							<div key={data.period} className="flex-1 flex flex-col items-center gap-2">
								<motion.div
									initial={{ height: 0 }}
									animate={{ height: `${(data.orders / maxOrders) * 100}%` }}
									transition={{ duration: 1, delay: index * 0.1 }}
									className="w-full bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t-lg relative group cursor-pointer"
								>
									<div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
										{data.orders} orders
									</div>
								</motion.div>
								<span className="text-xs text-gray-500">{data.period}</span>
							</div>
						))}
					</div>
				</motion.div>
			</div>

			{/* Category Sales & Top Products */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Category Sales */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="glass-card p-6"
				>
					<h2 className="text-xl font-bold mb-6">Sales by Category</h2>
					<div className="space-y-4">
						{categorySales.map((category, index) => (
							<div key={category.category}>
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">{category.category}</span>
									<span className="text-sm text-gray-500">
										KES {(category.sales / 1000000).toFixed(2)}M
									</span>
								</div>
								<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${category.percentage}%` }}
										transition={{ duration: 1, delay: index * 0.1 }}
										className={clsx("h-3 rounded-full", category.color)}
									/>
								</div>
								<p className="text-xs text-gray-500 mt-1">{category.percentage}% of total sales</p>
							</div>
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
							<h2 className="text-xl font-bold">Top Selling Products</h2>
							<p className="text-sm text-gray-500 mt-1">Best performers this period</p>
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
								<div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
									<Image
										src={product.image}
										alt={product.name}
										fill
										className="object-cover"
									/>
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm truncate">{product.name}</p>
									<p className="text-xs text-gray-500">{product.category}</p>
									<div className="flex items-center gap-3 mt-1">
										<span className="text-xs text-gray-500">{product.sales} sales</span>
										<span className="text-xs text-gray-400">
											KES {(product.revenue / 1000000).toFixed(2)}M
										</span>
									</div>
								</div>
								<div className="flex items-center gap-1 flex-shrink-0">
									{product.growth > 0 ? (
										<>
											<ArrowUpRight size={16} className="text-green-500" />
											<span className="text-sm font-medium text-green-500">
												{product.growth}%
											</span>
										</>
									) : (
										<>
											<ArrowDownRight size={16} className="text-red-500" />
											<span className="text-sm font-medium text-red-500">
												{Math.abs(product.growth)}%
											</span>
										</>
									)}
								</div>
							</motion.div>
						))}
					</div>
				</motion.div>
			</div>

			{/* Geographic Distribution */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.8 }}
				className="glass-card p-6"
			>
				<h2 className="text-xl font-bold mb-6">Sales by Region</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
					{[
						{ region: "Nairobi", sales: 892450, orders: 245 },
						{ region: "Mombasa", sales: 456200, orders: 128 },
						{ region: "Kisumu", sales: 312800, orders: 89 },
						{ region: "Nakuru", sales: 234600, orders: 67 },
						{ region: "Eldoret", sales: 178900, orders: 52 },
						{ region: "Nyeri", sales: 145300, orders: 41 },
						{ region: "Other", sales: 627100, orders: 183 },
					].map((region, index) => (
						<motion.div
							key={region.region}
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.8 + index * 0.05 }}
							className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 hover:scale-105 transition cursor-pointer"
						>
							<p className="text-sm font-medium mb-2">{region.region}</p>
							<p className="text-lg font-bold text-primary">
								KES {(region.sales / 1000000).toFixed(2)}M
							</p>
							<p className="text-xs text-gray-500 mt-1">{region.orders} orders</p>
						</motion.div>
					))}
				</div>
			</motion.div>

			{/* Payment Methods */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.9 }}
				className="glass-card p-6"
			>
				<h2 className="text-xl font-bold mb-6">Payment Methods</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[
						{
							method: "M-Pesa",
							percentage: 68,
							amount: "KES 1,936,198",
							color: "bg-green-500",
							orders: 1253,
						},
						{
							method: "Card",
							percentage: 24,
							amount: "KES 683,364",
							color: "bg-blue-500",
							orders: 443,
						},
						{
							method: "Cash on Delivery",
							percentage: 8,
							amount: "KES 227,788",
							color: "bg-orange-500",
							orders: 149,
						},
					].map((payment, index) => (
						<div
							key={payment.method}
							className="p-6 rounded-xl bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700"
						>
							<div className="flex items-center justify-between mb-4">
								<h3 className="font-semibold">{payment.method}</h3>
								<span className="text-2xl font-bold text-primary">{payment.percentage}%</span>
							</div>
							<p className="text-xl font-bold mb-2">{payment.amount}</p>
							<p className="text-sm text-gray-500">{payment.orders} orders</p>
							<div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${payment.percentage}%` }}
									transition={{ duration: 1, delay: 0.9 + index * 0.1 }}
									className={clsx("h-2 rounded-full", payment.color)}
								/>
							</div>
						</div>
					))}
				</div>
			</motion.div>
		</div>
	)
}