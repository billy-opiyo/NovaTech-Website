"use client"

import { useState, useEffect } from "react"
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
	Loader2,
	Filter,
} from "lucide-react"
import clsx from "clsx"
import { useToast } from "@/components/ui/Toast"

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

interface RegionSales { region: string; sales: number; orders: number }
interface PaymentMethodStats { method: string; percentage: number; amount: number; orders: number }
interface GrowthData { revenueGrowth: number; ordersGrowth: number; aovGrowth: number; conversionGrowth: number }
interface AnalyticsResponse {
	overview: { totalRevenue: number; totalOrders: number; averageOrderValue: number; conversionRate: number }
	growth?: GrowthData
	salesData: SalesData[]
	categorySales: Array<Omit<CategorySales, "color">>
	topProducts: TopProduct[]
	regionSales: RegionSales[]
	paymentMethods: PaymentMethodStats[]
	advancedAvailable?: boolean
}

const categoryColors: Record<string, string> = {
	Phones: "bg-blue-500",
	Laptops: "bg-green-500",
	Tablets: "bg-yellow-500",
	Accessories: "bg-purple-500",
}

export default function AdminAnalyticsPage() {
	const [timeRange, setTimeRange] = useState("7d")
	const [selectedMetric, setSelectedMetric] = useState("revenue")
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const { addToast } = useToast()

	const [metricsCards, setMetricsCards] = useState<MetricCard[]>([])
	const [salesData, setSalesData] = useState<SalesData[]>([])
	const [categorySales, setCategorySales] = useState<CategorySales[]>([])
	const [topProducts, setTopProducts] = useState<TopProduct[]>([])
	const [regionData, setRegionData] = useState<RegionSales[]>([])
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats[]>([])
	const [growthData, setGrowthData] = useState<GrowthData | null>(null)
	const [advancedAvailable, setAdvancedAvailable] = useState(true)
	const [exporting, setExporting] = useState<"csv" | "json" | null>(null)

	useEffect(() => {
		fetchAnalytics()
	}, [timeRange])

	const fetchAnalytics = async () => {
		try {
			setLoading(true)
			setError(null)
			const response = await fetch(`/api/analytics?timeRange=${timeRange}`)

			if (!response.ok) {
				throw new Error("Failed to fetch analytics data")
			}

			const data: AnalyticsResponse = await response.json()
			setAdvancedAvailable(data.advancedAvailable !== false)

			// Store growth data
			if (data.growth) {
				setGrowthData(data.growth)
			}

			// Transform overview metrics with real growth data
			const formatGrowth = (growth: number) => {
				const sign = growth >= 0 ? "+" : ""
				return `${sign}${growth.toFixed(1)}%`
			}

			setMetricsCards([
				{
					title: "Total Revenue",
					value: `KES ${data.overview.totalRevenue.toLocaleString()}`,
					change: data.growth ? formatGrowth(data.growth.revenueGrowth) : "+0%",
					changeType: data.growth && data.growth.revenueGrowth >= 0 ? "positive" : "negative",
					icon: DollarSign,
					color: "text-green-500",
					bgColor: "bg-green-500/10",
				},
				{
					title: "Total Orders",
					value: data.overview.totalOrders.toLocaleString(),
					change: data.growth ? formatGrowth(data.growth.ordersGrowth) : "+0%",
					changeType: data.growth && data.growth.ordersGrowth >= 0 ? "positive" : "negative",
					icon: ShoppingCart,
					color: "text-blue-500",
					bgColor: "bg-blue-500/10",
				},
				{
					title: "Average Order Value",
					value: `KES ${Math.round(data.overview.averageOrderValue).toLocaleString()}`,
					change: data.growth ? formatGrowth(data.growth.aovGrowth) : "+0%",
					changeType: data.growth && data.growth.aovGrowth >= 0 ? "positive" : "negative",
					icon: TrendingUp,
					color: "text-purple-500",
					bgColor: "bg-purple-500/10",
				},
				{
					title: "Conversion Rate",
					value: `${data.overview.conversionRate.toFixed(2)}%`,
					change: data.growth ? formatGrowth(data.growth.conversionGrowth) : "+0%",
					changeType: data.growth && data.growth.conversionGrowth >= 0 ? "positive" : "negative",
					icon: Users,
					color: "text-orange-500",
					bgColor: "bg-orange-500/10",
				},
			])

			// Transform sales data
			setSalesData(data.salesData)

			// Transform category sales
			setCategorySales(
				data.categorySales.map((cat) => ({
					...cat,
					color: categoryColors[cat.category] || "bg-gray-500",
				})),
			)

			// Transform top products
			setTopProducts(data.topProducts)

			// Transform region data
			setRegionData(data.regionSales)

			// Transform payment methods
			setPaymentMethods(data.paymentMethods)
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Unable to load analytics")
			console.error("Error fetching analytics:", err)
		} finally {
			setLoading(false)
		}
	}

	const handleExport = async (format: "csv" | "json") => {
		setExporting(format)
		try {
			const response = await fetch(`/api/analytics/export?timeRange=${timeRange}&format=${format}`)

			if (!response.ok) {
				throw new Error("Failed to export data")
			}

			if (format === "json") {
				const data = await response.json()
				const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
				const url = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = url
				a.download = `analytics-${timeRange}-${new Date().toISOString().split("T")[0]}.json`
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)
			} else {
				const blob = await response.blob()
				const url = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = url
				a.download = `analytics-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)
			}
		} catch (err: unknown) {
			console.error("Error exporting analytics:", err)
			addToast("Failed to export analytics data", "error")
		} finally { setExporting(null) }
	}

	const maxRevenue =
		salesData.length > 0 ? Math.max(...salesData.map((d) => d.revenue)) : 1
	const maxOrders =
		salesData.length > 0 ? Math.max(...salesData.map((d) => d.orders)) : 1

	return (
		<div className="space-y-6">
			{!advancedAvailable && (
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
					This is the Basic analytics view. Category, regional, payment-method, growth, and export reports are available on the Business and Enterprise plans.
				</div>
			)}
			{loading && (
				<div className="flex items-center justify-center py-12">
					<div className="text-lg text-gray-500">Loading analytics data...</div>
				</div>
			)}

			{error && (
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
					<p className="text-red-600 dark:text-red-400">Error: {error}</p>
				</div>
			)}

			{!loading && !error && (
				<>
					{/* Header */}
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
							<p className="text-gray-500 mt-1">
								Track your store performance and insights
							</p>
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
							<div className="relative group">
								<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
									<Download size={18} /> Export
								</button>
								<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
									<button
										onClick={() => handleExport("csv")}
										disabled={Boolean(exporting)}
										className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg text-sm"
									>
										{exporting === "csv" && <Loader2 size={14} className="mr-2 inline animate-spin" aria-hidden="true" />}Export as CSV
									</button>
									<button
										onClick={() => handleExport("json")}
										disabled={Boolean(exporting)}
										className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg text-sm"
									>
										{exporting === "json" && <Loader2 size={14} className="mr-2 inline animate-spin" aria-hidden="true" />}Export as JSON
									</button>
								</div>
							</div>
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
									<p className="text-sm text-gray-500 mt-1">
										Daily revenue for the period
									</p>
								</div>
							</div>
							<div className="h-64 flex items-end gap-2">
								{salesData.map((data, index) => (
									<div
										key={data.period}
										className="flex-1 flex flex-col items-center gap-2"
									>
										<motion.div
											initial={{ height: 0 }}
											animate={{
												height: `${(data.revenue / maxRevenue) * 100}%`,
											}}
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
									<p className="text-sm text-gray-500 mt-1">
										Daily orders for the period
									</p>
								</div>
							</div>
							<div className="h-64 flex items-end gap-2">
								{salesData.map((data, index) => (
									<div
										key={data.period}
										className="flex-1 flex flex-col items-center gap-2"
									>
										<motion.div
											initial={{ height: 0 }}
											animate={{
												height: `${(data.orders / maxOrders) * 100}%`,
											}}
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
											<span className="text-sm font-medium">
												{category.category}
											</span>
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
										<p className="text-xs text-gray-500 mt-1">
											{category.percentage.toFixed(1)}% of total sales
										</p>
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
									<p className="text-sm text-gray-500 mt-1">
										Best performers this period
									</p>
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
											<p className="font-medium text-sm truncate">
												{product.name}
											</p>
											<p className="text-xs text-gray-500">
												{product.category}
											</p>
											<div className="flex items-center gap-3 mt-1">
												<span className="text-xs text-gray-500">
													{product.sales} sales
												</span>
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
						{regionData.length > 0 ? (
							<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
								{regionData.map((region, index) => (
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
										<p className="text-xs text-gray-500 mt-1">
											{region.orders} orders
										</p>
									</motion.div>
								))}
							</div>
						) : (
							<p className="text-gray-500 text-center py-8">
								No sales data available for this period
							</p>
						)}
					</motion.div>

					{/* Payment Methods */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.9 }}
						className="glass-card p-6"
					>
						<h2 className="text-xl font-bold mb-6">Payment Methods</h2>
						{paymentMethods.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{paymentMethods.map((payment, index) => (
									<div
										key={payment.method}
										className="p-6 rounded-xl bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700"
									>
										<div className="flex items-center justify-between mb-4">
											<h3 className="font-semibold">{payment.method}</h3>
											<span className="text-2xl font-bold text-primary">
												{payment.percentage.toFixed(1)}%
											</span>
										</div>
										<p className="text-xl font-bold mb-2">
											KES {payment.amount.toLocaleString()}
										</p>
										<p className="text-sm text-gray-500">
											{payment.orders} orders
										</p>
										<div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: `${payment.percentage}%` }}
												transition={{ duration: 1, delay: 0.9 + index * 0.1 }}
												className="h-2 rounded-full bg-gradient-to-r from-primary to-accent"
											/>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-gray-500 text-center py-8">
								No payment data available for this period
							</p>
						)}
					</motion.div>
				</>
			)}
		</div>
	)
}
