"use client"

import { useState } from "react"
import Link from "next/link"
import { useTheme } from "@/components/providers/ThemeProvider"
import SearchOverlay from "@/components/search/SearchOverlay"
import { Moon, Sun, ShoppingCart, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import clsx from "clsx"

const navLinks = [
	{ name: "Home", href: "/" },
	{ name: "Phones", href: "/category/phones" },
	{ name: "Laptops", href: "/category/laptops" },
	{ name: "Accessories", href: "/category/accessories" },
	{ name: "Deals", href: "/deals" },
]

export default function Header() {
	const { theme, toggleTheme } = useTheme()
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	return (
		<header className="sticky top-0 z-50 glass backdrop-blur-lg border-b border-white/10">
			<div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
				<div className="flex justify-between items-center py-3 sm:py-4 gap-2">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-2 min-w-0">
						<ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
						<span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
							NovaTech Store
						</span>
					</Link>

					{/* Desktop Nav */}
					<nav className="hidden md:flex gap-4 lg:gap-6">
						{navLinks.map((link) => (
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
					<div className="flex items-center gap-2 sm:gap-4">
						<button
							onClick={toggleTheme}
							className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
							aria-label="Toggle dark mode"
						>
							{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
						</button>
						<SearchOverlay />
						<Link
							href="/cart"
							className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition relative"
						>
							<ShoppingCart size={20} />
							<span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
								0
							</span>
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
							{navLinks.map((link) => (
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
