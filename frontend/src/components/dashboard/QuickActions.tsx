"use client"

import { motion } from "framer-motion"
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react"

const actions = [
	{ label: "Add Product", icon: Package, href: "/admin/products" },
	{ label: "View Orders", icon: ShoppingCart, href: "/admin/orders" },
	{ label: "Manage Customers", icon: Users, href: "/admin/customers" },
	{ label: "View Analytics", icon: TrendingUp, href: "/admin/analytics" },
]

export default function QuickActions() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.8 }}
			className="glass-card p-6"
		>
			<h2 className="text-xl font-bold mb-4">Quick Actions</h2>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{actions.map((action) => (
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
	)
}