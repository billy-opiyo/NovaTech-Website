"use client"

import { motion } from "framer-motion"
import { ShoppingCart, Users, DollarSign, Package, ArrowUpRight, ArrowDownRight } from "lucide-react"
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

export default function StatsGrid() {
	return (
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
	)
}