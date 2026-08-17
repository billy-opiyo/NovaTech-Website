"use client"

import { motion } from "framer-motion"
import { TrendingUp, Eye } from "lucide-react"
import Link from "next/link"
import StatsGrid from "@/components/dashboard/StatsGrid"
import RecentOrders from "@/components/dashboard/RecentOrders"
import TopProducts from "@/components/dashboard/TopProducts"
import QuickActions from "@/components/dashboard/QuickActions"

export default function AdminDashboardPage() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
					<p className="text-gray-500 mt-1">Welcome back, Admin! Here&apos;s what&apos;s happening.</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Link href="/" className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
						<Eye size={18} /> View Store
					</Link>
					<Link href="/admin/analytics" className="btn-primary flex items-center gap-2">
						<TrendingUp size={18} /> View Report
					</Link>
				</div>
			</div>

			{/* Stats Grid */}
			<StatsGrid />

			{/* Charts Row */}
			<div className="grid grid-cols-1 gap-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="glass-card p-6"
				>
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-xl font-bold">Sales Overview</h2>
							<p className="text-sm text-gray-500 mt-1">Revenue for the last 7 days</p>
						</div>
					</div>
					<div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
						<p className="text-gray-500">Live revenue and order charts are available in Analytics.</p>
						<Link href="/admin/analytics" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Open Analytics</Link>
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
