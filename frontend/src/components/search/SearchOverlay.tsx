"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Search, X, TrendingUp, Clock, ArrowRight, Zap } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import clsx from "clsx"

interface SearchSuggestion {
	type: "product" | "category" | "brand" | "recent"
	text: string
	href: string
	image?: string
	price?: number
}

const popularSearches = [
	"iPhone 15",
	"MacBook",
	"Samsung Galaxy",
	"Gaming Laptop",
	"AirPods",
	"Smartwatch",
	"4K TV",
	"iPad",
]

export default function SearchOverlay() {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault()
				setIsOpen(true)
			}
			if (e.key === "Escape") {
				setIsOpen(false)
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus()
		}
	}, [isOpen])

	useEffect(() => {
		if (query.length < 1) {
			setSuggestions([])
			return
		}

		const mockSuggestions: SearchSuggestion[] = [
			{
				type: "product",
				text: "iPhone 15 Pro Max 256GB",
				href: "/products/iphone-15-pro-max",
				image: "https://placehold.co/50x50/1e293b/white?text=IP",
				price: 159999,
			},
			{
				type: "product",
				text: "iPhone 15 Plus",
				href: "/products/iphone-15-plus",
				image: "https://placehold.co/50x50/1e293b/white?text=IP",
				price: 129999,
			},
			{
				type: "category",
				text: "Phones",
				href: "/category/phones",
			},
			{
				type: "brand",
				text: "Apple",
				href: "/products?brand=apple",
			},
			{
				type: "recent",
				text: query,
				href: `/search?q=${encodeURIComponent(query)}`,
			},
		]

		setSuggestions(mockSuggestions)
	}, [query])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault()
			setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
		} else if (e.key === "ArrowUp") {
			e.preventDefault()
			setSelectedIndex((prev) => Math.max(prev - 1, -1))
		} else if (e.key === "Enter") {
			if (selectedIndex >= 0 && suggestions[selectedIndex]) {
				router.push(suggestions[selectedIndex].href)
				setIsOpen(false)
			} else if (query) {
				router.push(`/products?q=${encodeURIComponent(query)}`)
				setIsOpen(false)
			}
		}
	}

	return (
		<>
			<button
				onClick={() => setIsOpen(true)}
				className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition w-64"
			>
				<Search size={16} />
				<span className="flex-1 text-left">Search products...</span>
				<kbd className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
					⌘K
				</kbd>
			</button>

			<AnimatePresence>
				{isOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
							onClick={() => setIsOpen(false)}
						/>
						<motion.div
							initial={{ opacity: 0, y: -20, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -20, scale: 0.95 }}
							className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
						>
							<div className="glass-card p-4">
								<div className="relative">
									<Search
										className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
										size={20}
									/>
									<input
										ref={inputRef}
										type="text"
										value={query}
										onChange={(e) => {
											setQuery(e.target.value)
											setSelectedIndex(-1)
										}}
										onKeyDown={handleKeyDown}
										placeholder='Search... (e.g., "i7 laptop 16GB RAM")'
										className="w-full pl-12 pr-12 py-4 text-lg bg-transparent border-none outline-none"
									/>
									<button
										onClick={() => setIsOpen(false)}
										className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
									>
										<X size={20} />
									</button>
								</div>

								{suggestions.length > 0 && (
									<div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2 max-h-96 overflow-y-auto">
										{suggestions.map((suggestion, i) => (
											<Link
												key={i}
												href={suggestion.href}
												onClick={() => setIsOpen(false)}
												className={clsx(
													"flex items-center gap-3 px-4 py-3 rounded-lg transition",
													i === selectedIndex
														? "bg-primary/10"
														: "hover:bg-black/5 dark:hover:bg-white/5",
												)}
											>
												{suggestion.type === "product" && suggestion.image && (
													<div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
														<Image
															src={suggestion.image}
															alt=""
															fill
															className="object-cover"
														/>
													</div>
												)}
												{suggestion.type === "category" && (
													<div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
														<Search size={18} className="text-blue-500" />
													</div>
												)}
												{suggestion.type === "brand" && (
													<div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
														<Zap size={18} className="text-purple-500" />
													</div>
												)}
												{suggestion.type === "recent" && (
													<div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
														<Clock size={18} className="text-gray-500" />
													</div>
												)}
												<div className="flex-1">
													<p className="font-medium">{suggestion.text}</p>
													{suggestion.price && (
														<p className="text-sm text-primary">
															KES {suggestion.price.toLocaleString()}
														</p>
													)}
												</div>
												<ArrowRight size={16} className="text-gray-400" />
											</Link>
										))}
									</div>
								)}

								{query && suggestions.length === 0 && (
									<div className="text-center py-8">
										<Search className="mx-auto mb-3 text-gray-400" size={32} />
										<p className="text-gray-500">No results for "{query}"</p>
									</div>
								)}

								{!query && (
									<div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
										<p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-4">
											<TrendingUp size={14} className="inline mr-1" /> Popular
											Searches
										</p>
										<div className="flex flex-wrap gap-2 px-4">
											{popularSearches.map((search) => (
												<Link
													key={search}
													href={`/products?q=${encodeURIComponent(search)}`}
													onClick={() => setIsOpen(false)}
													className="px-3 py-1.5 text-sm rounded-full bg-black/5 dark:bg-white/5 hover:bg-primary/10 hover:text-primary transition"
												>
													{search}
												</Link>
											))}
										</div>
									</div>
								)}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	)
}
