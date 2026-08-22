"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react"

const actions = [
	{ label: "Add Product", icon: Package, path: "/products" },
	{ label: "View Orders", icon: ShoppingCart, path: "/orders" },
	{ label: "Manage Customers", icon: Users, path: "/customers" },
	{ label: "View Analytics", icon: TrendingUp, path: "/analytics" },
]

export default function QuickActions() {
	const pathname = usePathname()
	const basePath = pathname.startsWith("/manage") ? "/manage" : "/admin"

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
					<Link
						key={action.label}
						href={`${basePath}${action.path}`}
						className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition"
					>
						<action.icon size={28} className="text-primary" />
						<span className="text-sm font-medium">{action.label}</span>
					</Link>
				))}
			</div>
		</motion.div>
	)
}
