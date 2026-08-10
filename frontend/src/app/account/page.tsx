"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
	User,
	Package,
	Heart,
	MapPin,
	Settings,
	LogOut,
	ShoppingBag,
	Clock,
	ChevronRight,
	Star,
	Bell,
} from "lucide-react"

const mockOrders = [
	{
		id: "EB-001",
		date: "2024-08-15",
		status: "Delivered",
		total: 174999,
		items: 2,
	},
	{
		id: "EB-002",
		date: "2024-08-20",
		status: "Processing",
		total: 34999,
		items: 1,
	},
	{
		id: "EB-003",
		date: "2024-08-25",
		status: "Shipped",
		total: 89999,
		items: 3,
	},
]

const menuItems = [
	{
		icon: Package,
		label: "My Orders",
		href: "/account/orders",
		count: mockOrders.length,
	},
	{ icon: Heart, label: "Wishlist", href: "/account/wishlist", count: 5 },
	{ icon: MapPin, label: "Addresses", href: "/account/addresses", count: 2 },
	{
		icon: Bell,
		label: "Notifications",
		href: "/account/notifications",
		count: 3,
	},
	{ icon: Settings, label: "Account Settings", href: "/account/settings" },
]

export default function AccountPage() {
	return (
		<div>
			<h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">
				My Account
			</h1>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
				<div className="lg:col-span-1">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="glass-card p-5 sm:p-6 text-center"
					>
						<div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
							<User size={40} className="text-primary" />
						</div>
						<h2 className="text-xl font-semibold">John Doe</h2>
						<p className="text-gray-500 text-sm">john@example.com</p>
						<p className="text-xs text-gray-400 mt-1">
							Member since August 2024
						</p>
						<button className="mt-4 text-sm text-red-500 hover:text-red-600 flex items-center justify-center justify-center justify-center justify-center gap-1 mx-auto">
							<LogOut size={14} /> Sign Out
						</button>
					</motion.div>

					<div className="mt-6 space-y-2">
						{menuItems.map((item, i) => (
							<motion.div
								key={item.href}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: i * 0.1 }}
							>
								<Link
									href={item.href}
									className="glass-card p-4 flex items-center justify-between hover:bg-white/20 transition group"
								>
									<div className="flex items-center gap-3">
										<item.icon size={20} className="text-primary" />
										<span className="font-medium">{item.label}</span>
									</div>
									<div className="flex items-center gap-2">
										{item.count !== undefined && (
											<span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
												{item.count}
											</span>
										)}
										<ChevronRight
											size={16}
											className="text-gray-400 group-hover:text-primary transition"
										/>
									</div>
								</Link>
							</motion.div>
						))}
					</div>
				</div>

				<div className="lg:col-span-2 space-y-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="glass-card p-4 sm:p-6"
					>
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
							<h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
								<ShoppingBag size={24} className="text-primary" /> Recent Orders
							</h2>
							<Link
								href="/account/orders"
								className="text-primary hover:underline text-sm"
							>
								View All
							</Link>
						</div>

						<div className="space-y-4">
							{mockOrders.map((order) => (
								<Link
									key={order.id}
									href={`/account/orders/${order.id}`}
									className="flex flex-col gap-3 p-4 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition sm:flex-row sm:items-center sm:justify-between"
								>
									<div>
										<p className="font-semibold">Order #{order.id}</p>
										<p className="text-sm text-gray-500 flex items-center gap-1">
											<Clock size={12} /> {order.date}
										</p>
									</div>
									<div className="text-left sm:text-center">
										<span
											className={`text-xs px-2 py-1 rounded-full ${
												order.status === "Delivered"
													? "bg-green-500/20 text-green-600"
													: order.status === "Shipped"
														? "bg-blue-500/20 text-blue-600"
														: "bg-orange-500/20 text-orange-600"
											}`}
										>
											{order.status}
										</span>
									</div>
									<div className="text-left sm:text-right">
										<p className="font-semibold">
											KES {order.total.toLocaleString()}
										</p>
										<p className="text-sm text-gray-500">{order.items} items</p>
									</div>
									<ChevronRight
										size={16}
										className="text-gray-400 self-end sm:self-center"
									/>
								</Link>
							))}
						</div>
					</motion.div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
						{[
							{ icon: Package, label: "Total Orders", value: "12" },
							{ icon: Clock, label: "Pending", value: "2" },
							{ icon: Heart, label: "Wishlist", value: "5" },
							{ icon: Star, label: "Reviews", value: "8" },
						].map((stat, i) => (
							<motion.div
								key={stat.label}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 + i * 0.1 }}
								className="glass-card p-4 text-center"
							>
								<stat.icon className="mx-auto mb-2 text-primary" size={24} />
								<p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
								<p className="text-xs text-gray-500">{stat.label}</p>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
