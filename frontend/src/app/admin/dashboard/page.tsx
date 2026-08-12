"use client"

import { motion } from "framer-motion"
import { TrendingUp, Eye, AlertCircle, CheckCircle2, Clock, Truck } from "lucide-react"
import clsx from "clsx"
import StatsGrid from "@/components/dashboard/StatsGrid"
import RecentOrders from "@/components/dashboard/RecentOrders"
import TopProducts from "@/components/dashboard/TopProducts"
import QuickActions from "@/components/dashboard/QuickActions"

const orderStatusStats = [
	{ label: "Completed", count: 980, percentage: 78.7, color: "bg-green-500" },
	{ label: "Processing", count: 145, percentage: 11.6, color: "bg-blue-500" },
	{ label: "Pending", count: 67, percentage: 5.4, color: "bg-yellow-500" },
	{ label: "Cancelled", count: 53, percentage: 4.3, color: "bg-red-500" },
]

export default function AdminDashboardPage() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
					<p className="text-gray-500 mt-1">Welcome back, Admin! Here&apos;s what&apos;s happening.</p>
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
			<StatsGrid />

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
				<RecentOrders />
				<TopProducts />
			</div>

			{/* Quick Actions */}
			<QuickActions />
		</div>
	)
}