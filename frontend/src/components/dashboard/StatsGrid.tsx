"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from "lucide-react"
import clsx from "clsx"

interface MetricCard {
	label: string
	value: string
	change: string
	changeType: "positive" | "negative"
	icon: React.ElementType
	color: string
	bgColor: string
}

interface AnalyticsResponse {
	overview: {
		totalRevenue: number
		totalOrders: number
		averageOrderValue: number
		conversionRate: number
	}
	growth?: {
		revenueGrowth: number
		ordersGrowth: number
		aovGrowth: number
		conversionGrowth: number
	}
}

function formatGrowth(value: number) {
	return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

export default function StatsGrid() {
	const [cards, setCards] = useState<MetricCard[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		let active = true
		fetch("/api/analytics?timeRange=7d")
			.then(async (response) => {
				if (!response.ok) throw new Error("Unable to load dashboard metrics")
				return response.json() as Promise<AnalyticsResponse>
			})
			.then((data) => {
				if (!active) return
				const growth = data.growth
				const metric = (value: string, change: number | undefined, label: string, icon: React.ElementType, color: string, bgColor: string): MetricCard => ({
					label,
					value,
					change: change === undefined ? "—" : formatGrowth(change),
					changeType: change === undefined || change >= 0 ? "positive" : "negative",
					icon,
					color,
					bgColor,
				})
				setCards([
					metric(`KES ${data.overview.totalRevenue.toLocaleString()}`, growth?.revenueGrowth, "Revenue (7 days)", DollarSign, "text-green-500", "bg-green-500/10"),
					metric(data.overview.totalOrders.toLocaleString(), growth?.ordersGrowth, "Orders (7 days)", ShoppingCart, "text-blue-500", "bg-blue-500/10"),
					metric(`KES ${Math.round(data.overview.averageOrderValue).toLocaleString()}`, growth?.aovGrowth, "Average order value", Package, "text-purple-500", "bg-purple-500/10"),
					metric(`${data.overview.conversionRate.toFixed(2)}%`, growth?.conversionGrowth, "Paid order rate", Users, "text-orange-500", "bg-orange-500/10"),
				])
			})
			.catch((reason: Error) => {
				if (active) setError(reason.message)
			})
			.finally(() => {
				if (active) setLoading(false)
			})
		return () => { active = false }
	}, [])

	if (loading) return <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"><div className="glass-card p-6 text-sm text-gray-500 md:col-span-2 lg:col-span-4">Loading dashboard metrics…</div></div>
	if (error) return <div className="glass-card p-6 text-sm text-red-500">{error}</div>
	if (!cards.length) return <div className="glass-card p-6 text-sm text-gray-500">No dashboard metrics are available yet.</div>

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{cards.map((stat, index) => (
				<motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="glass-card navy-glass p-6">
					<div className="mb-4 flex items-start justify-between">
						<div className={clsx("rounded-xl p-3", stat.bgColor)}><stat.icon className={stat.color} size={24} /></div>
						<div className={clsx("flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium", stat.changeType === "positive" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600")}>
							{stat.changeType === "positive" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{stat.change}
						</div>
					</div>
					<p className="mb-1 text-2xl font-bold">{stat.value}</p>
					<p className="text-sm text-gray-500">{stat.label}</p>
				</motion.div>
			))}
		</div>
	)
}
