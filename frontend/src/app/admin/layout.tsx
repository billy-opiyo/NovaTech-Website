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
	ShieldCheck,
	Activity,
	Palette,
	CreditCard,
	Globe2,
	Download,
	ClipboardList,
	ClipboardCheck,
	LoaderCircle,
	Home,
} from "lucide-react"
import clsx from "clsx"
import { useStoreContext } from "@/lib/store-context"
import { getStoreHomeHref, getStoreRouteHref } from "@/lib/store-home"

const sidebarLinks = (basePath: string, store: ReturnType<typeof useStoreContext>) => [
	{
		section: "Main",
		items: [
			{ icon: LayoutDashboard, label: "Dashboard", href: getStoreRouteHref(store, `${basePath}/dashboard`), activeHref: `${basePath}/dashboard` },
			{ icon: BarChart3, label: "Analytics", href: getStoreRouteHref(store, `${basePath}/analytics`), activeHref: `${basePath}/analytics` },
		],
	},
	{
		section: "Management",
		items: [
			{ icon: Package, label: "Products", href: getStoreRouteHref(store, `${basePath}/products`), activeHref: `${basePath}/products` },
			{ icon: Download, label: "Catalog import/export", href: getStoreRouteHref(store, `${basePath}/catalog`), activeHref: `${basePath}/catalog` },
			{ icon: ClipboardList, label: "Enquiries & quotes", href: getStoreRouteHref(store, `${basePath}/enquiries`), activeHref: `${basePath}/enquiries` },
			{ icon: ShoppingCart, label: "Orders", href: getStoreRouteHref(store, `${basePath}/orders`), activeHref: `${basePath}/orders` },
			{ icon: Users, label: "Customers", href: getStoreRouteHref(store, `${basePath}/customers`), activeHref: `${basePath}/customers` },
			{ icon: UsersRound, label: "Team access", href: getStoreRouteHref(store, `${basePath}/team`), activeHref: `${basePath}/team` },
			{ icon: Star, label: "Reviews", href: getStoreRouteHref(store, `${basePath}/reviews`), activeHref: `${basePath}/reviews` },
			{ icon: Truck, label: "Deliveries", href: getStoreRouteHref(store, `${basePath}/deliveries`), activeHref: `${basePath}/deliveries` },
		],
	},
	{
		section: "Support",
		items: [
			{ icon: Ticket, label: "Support Tickets", href: getStoreRouteHref(store, `${basePath}/support`), activeHref: `${basePath}/support` },
			{ icon: MessageSquare, label: "Messages", href: getStoreRouteHref(store, `${basePath}/messages`), activeHref: `${basePath}/messages` },
		],
	},
	{
		section: "System",
		items: [
			{ icon: Settings, label: "Settings", href: getStoreRouteHref(store, `${basePath}/settings`), activeHref: `${basePath}/settings` },
			{ icon: Palette, label: "Store design", href: getStoreRouteHref(store, `${basePath}/design`), activeHref: `${basePath}/design` },
			{ icon: Globe2, label: "Domains", href: getStoreRouteHref(store, `${basePath}/domains`), activeHref: `${basePath}/domains` },
			{ icon: ClipboardCheck, label: "Launch readiness", href: getStoreRouteHref(store, `${basePath}/readiness`), activeHref: `${basePath}/readiness` },
			{ icon: CreditCard, label: "Subscription", href: getStoreRouteHref(store, `${basePath}/billing`), activeHref: `${basePath}/billing` },
			{ icon: ShieldCheck, label: "Verification", href: getStoreRouteHref(store, `${basePath}/verification`), activeHref: `${basePath}/verification` },
			{ icon: Download, label: "Data export", href: getStoreRouteHref(store, `${basePath}/data-export`), activeHref: `${basePath}/data-export` },
			{ icon: Shield, label: "Security", href: getStoreRouteHref(store, `${basePath}/security`), activeHref: `${basePath}/security` },
			{ icon: Activity, label: "Activity Log", href: getStoreRouteHref(store, `${basePath}/activity`), activeHref: `${basePath}/activity` },
		],
	},
]

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const pathname = usePathname()
	const basePath = pathname.includes("/manage") ? "/manage" : "/admin"
	const [sidebarOpen, setSidebarOpen] = useState(true)
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

	return (
		<div className="admin-workspace min-h-screen bg-gray-50 dark:bg-dark-bg">
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
					"min-w-0 transition-all duration-300",
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

				<main className="min-w-0 p-4 md:p-8">{children}</main>
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
	const store = useStoreContext()
	const activePathname = pathname.includes(basePath) ? pathname.slice(pathname.indexOf(basePath)) : pathname
	const [signingOut, setSigningOut] = useState(false)

	async function handleSignOut() {
		setSigningOut(true)
		try {
			await signOut({ callbackUrl: getStoreHomeHref(store) })
		} catch {
			setSigningOut(false)
		}
	}

	return (
		<div className="flex flex-col h-full">
			<div className="p-6 border-b border-gray-200 dark:border-gray-700">
				<Link href={getStoreRouteHref(store, `${basePath}/dashboard`)} className="flex items-center gap-3">
					<Zap className="text-primary flex-shrink-0" size={28} />
					{!collapsed && (
						<span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
							Admin
						</span>
					)}
				</Link>
			</div>

			<nav className="flex-1 overflow-y-auto p-4">
				<div className="mb-6">
					<Link
						href={getStoreHomeHref(store)}
						onClick={onClose}
						title={`${store.brand.name || store.storeSlug} Home`}
						className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
					>
						<Home size={20} className="flex-shrink-0" />
						{!collapsed && <span className="text-sm font-medium">{store.brand.name || store.storeSlug} Home</span>}
					</Link>
				</div>
				{sidebarLinks(basePath, store).map((section) => (
					<div key={section.section} className="mb-6">
						{!collapsed && (
							<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
								{section.section}
							</p>
						)}
						<div className="space-y-1">
							{section.items.map((item) => {
								const isActive = activePathname === item.activeHref
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
					disabled={signingOut}
					aria-busy={signingOut}
					onClick={() => void handleSignOut()}
					className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
				>
					{signingOut ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <LogOut size={20} aria-hidden="true" />}
					{!collapsed && <span className="text-sm font-medium">{signingOut ? "Signing out…" : "Sign Out"}</span>}
				</button>
			</div>
		</div>
	)
}
