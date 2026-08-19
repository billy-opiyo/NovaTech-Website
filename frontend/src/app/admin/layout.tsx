"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
	LayoutDashboard,
	Package,
	ShoppingCart,
	Users,
	UsersRound,
	Star,
	Ticket,
	BarChart3,
	Settings,
	LogOut,
	Menu,
	Zap,
	Truck,
	MessageSquare,
	Shield,
	Activity,
	Palette,
	CreditCard,
	Globe2,
	Download,
} from "lucide-react"
import clsx from "clsx"

const sidebarLinks = (basePath: string) => [
	{
		section: "Main",
		items: [
			{ icon: LayoutDashboard, label: "Dashboard", href: `${basePath}/dashboard` },
			{ icon: BarChart3, label: "Analytics", href: `${basePath}/analytics` },
		],
	},
	{
		section: "Management",
		items: [
			{ icon: Package, label: "Products", href: `${basePath}/products` },
			{ icon: ShoppingCart, label: "Orders", href: `${basePath}/orders` },
		{ icon: Users, label: "Customers", href: `${basePath}/customers` },
			{ icon: UsersRound, label: "Team access", href: `${basePath}/team` },
			{ icon: Star, label: "Reviews", href: `${basePath}/reviews` },
			{ icon: Truck, label: "Deliveries", href: `${basePath}/deliveries` },
		],
	},
	{
		section: "Support",
		items: [
			{ icon: Ticket, label: "Support Tickets", href: `${basePath}/support` },
			{ icon: MessageSquare, label: "Messages", href: `${basePath}/messages` },
		],
	},
	{
		section: "System",
		items: [
		{ icon: Settings, label: "Settings", href: `${basePath}/settings` },
			{ icon: Palette, label: "Store design", href: `${basePath}/design` },
			{ icon: Globe2, label: "Domains", href: `${basePath}/domains` },
			{ icon: CreditCard, label: "Subscription", href: `${basePath}/billing` },
			{ icon: Download, label: "Data export", href: `${basePath}/data-export` },
			{ icon: Shield, label: "Security", href: `${basePath}/security` },
			{ icon: Activity, label: "Activity Log", href: `${basePath}/activity` },
		],
	},
]

export default function AdminLayout({
	children,
	basePath = "/admin",
}: {
	children: React.ReactNode
	basePath?: string
}) {
	const pathname = usePathname()
	const [sidebarOpen, setSidebarOpen] = useState(true)
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
	const sidebarLinksForPath = sidebarLinks(basePath)

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
			<AnimatePresence>
				{mobileSidebarOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/50 z-40 lg:hidden"
							onClick={() => setMobileSidebarOpen(false)}
						/>
						<motion.aside
							initial={{ x: -280 }}
							animate={{ x: 0 }}
							exit={{ x: -280 }}
							className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-white dark:bg-dark-surface shadow-2xl lg:hidden overflow-y-auto"
						>
							<SidebarContent
								pathname={pathname}
								basePath={basePath}
								onClose={() => setMobileSidebarOpen(false)}
							/>
						</motion.aside>
					</>
				)}
			</AnimatePresence>

			<aside
				className={clsx(
					"fixed left-0 top-0 bottom-0 z-30 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-gray-700 transition-all duration-300 hidden lg:block",
					sidebarOpen ? "w-72" : "w-20",
				)}
			>
				<SidebarContent pathname={pathname} basePath={basePath} collapsed={!sidebarOpen} />
			</aside>

			<div
				className={clsx(
					"transition-all duration-300",
					sidebarOpen ? "lg:ml-72" : "lg:ml-20",
				)}
			>
				<header className="sticky top-0 z-20 glass navy-glass backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between px-4 md:px-8 py-4">
					<div className="flex items-center gap-4">
							<button
								onClick={() => {
									if (window.innerWidth < 1024) {
										setMobileSidebarOpen(true)
									} else {
										setSidebarOpen(!sidebarOpen)
									}
								}}
								className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
							>
								<Menu size={20} />
							</button>
						</div>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
									<Users size={16} className="text-primary" />
								</div>
								<div className="hidden md:block">
								<p className="text-sm font-medium">Store workspace</p>
								<p className="text-xs text-gray-500">Membership-controlled access</p>
								</div>
							</div>
						</div>
					</div>
				</header>

				<main className="p-4 md:p-8">{children}</main>
			</div>
		</div>
	)
}

function SidebarContent({
	pathname,
	basePath = "/admin",
	collapsed,
	onClose,
}: {
	pathname: string
	basePath?: string
	collapsed?: boolean
	onClose?: () => void
}) {
	return (
		<div className="flex flex-col h-full">
			<div className="p-6 border-b border-gray-200 dark:border-gray-700">
				<Link href={`${basePath}/dashboard`} className="flex items-center gap-3">
					<Zap className="text-primary flex-shrink-0" size={28} />
					{!collapsed && (
						<span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
							Admin
						</span>
					)}
				</Link>
			</div>

			<nav className="flex-1 overflow-y-auto p-4">
					{sidebarLinks(basePath).map((section) => (
					<div key={section.section} className="mb-6">
						{!collapsed && (
							<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
								{section.section}
							</p>
						)}
						<div className="space-y-1">
							{section.items.map((item) => {
								const isActive = pathname === item.href
								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={onClose}
										className={clsx(
											"flex items-center gap-3 px-3 py-2.5 rounded-lg transition group",
											isActive
												? "bg-primary/10 text-primary"
												: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
										)}
									>
										<item.icon
											size={20}
											className={clsx(
												isActive
													? "text-primary"
													: "text-gray-400 group-hover:text-gray-600",
											)}
										/>
										{!collapsed && (
											<span className="text-sm font-medium">{item.label}</span>
										)}
									</Link>
								)
							})}
						</div>
					</div>
				))}
			</nav>

			<div className="p-4 border-t border-gray-200 dark:border-gray-700">
				<button
					type="button"
					onClick={() => signOut({ callbackUrl: "/" })}
					className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
				>
					<LogOut size={20} />
					{!collapsed && <span className="text-sm font-medium">Sign Out</span>}
				</button>
			</div>
		</div>
	)
}
