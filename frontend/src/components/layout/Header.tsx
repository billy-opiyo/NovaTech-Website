"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "@/components/providers/ThemeProvider"
import SearchOverlay from "@/components/search/SearchOverlay"
import NotificationCenter from "@/components/notifications/NotificationCenter"
import { Moon, Sun, ShoppingCart, Menu, X, User } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { clientConfig } from "@/config/client.config"
import { useCart } from "@/lib/cartContext"

export default function Header() {
	const { theme, toggleTheme } = useTheme()
	const { itemCount } = useCart()
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	return (
		<header className="site-header sticky top-0 z-[60] glass navy-glass backdrop-blur-lg border-b border-white/10">
			<div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
				<div className="flex items-center justify-between gap-1 py-3 sm:gap-2 sm:py-4">
					{/* Logo */}
					<Link href="/" className="flex shrink-0 items-center gap-2">
						<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-lg shadow-primary/20 sm:h-11 sm:w-11">
							<Image
								src={clientConfig.brand.logo}
								alt={clientConfig.brand.logoAlt}
								fill
								sizes="(max-width: 640px) 40px, 44px"
								className="object-contain"
							/>
						</div>
						<span className="whitespace-nowrap text-base font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent sm:text-xl lg:text-2xl">
							{clientConfig.brand.name}
						</span>
					</Link>
					<nav className="hidden gap-3 md:flex lg:gap-6">
						{clientConfig.navigation.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
							>
								{link.name}
							</Link>
						))}
					</nav>

					{/* Right side icons */}
					<div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
						<button
							onClick={toggleTheme}
							className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
							aria-label="Toggle dark mode"
						>
							{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
						</button>
						<SearchOverlay />
						<NotificationCenter />
						<Link
							href="/cart"
							aria-label="Open shopping cart"
							className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition relative"
						>
							<ShoppingCart size={20} />
							{itemCount > 0 && (
								<span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
									{itemCount}
								</span>
							)}
						</Link>
						<Link
							href="/account"
							aria-label="Open account"
							className="rounded-full p-2 transition hover:bg-gray-200 dark:hover:bg-gray-700"
						>
							<User size={20} />
						</Link>

						{/* Mobile menu toggle */}
						<button
							className="md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						className="md:hidden glass border-t border-white/10 overflow-hidden"
					>
						<div className="px-4 py-4 flex flex-col gap-3">
							{clientConfig.navigation.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className="block text-gray-700 dark:text-gray-300 hover:text-primary"
									onClick={() => setMobileMenuOpen(false)}
								>
									{link.name}
								</Link>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</header>
	)
}
