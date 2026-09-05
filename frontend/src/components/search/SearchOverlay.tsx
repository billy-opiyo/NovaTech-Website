"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Search, X, TrendingUp, Clock, ArrowRight, Zap, FileText } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import clsx from "clsx"
import { getProductImage } from "@/constants/productImages"
import { publicPages } from "@/constants/publicPages"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

interface SearchSuggestion {
	type: "product" | "page" | "category" | "brand" | "recent"
	text: string
	href: string
	description?: string
	image?: string
	price?: number
}

interface ProductSearchResult {
	name: string
	slug: string
	images?: string[]
	discountedPrice?: number | null
	price: number
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

interface SearchOverlayProps {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	showTrigger?: boolean
}

export default function SearchOverlay({ open, onOpenChange, showTrigger = true }: SearchOverlayProps = {}) {
	const router = useRouter()
	const store = useStoreContext()
	const [internalOpen, setInternalOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const inputRef = useRef<HTMLInputElement>(null)
	const isOpen = open ?? internalOpen
	const setOpen = useCallback((nextOpen: boolean) => {
		if (open === undefined) setInternalOpen(nextOpen)
		onOpenChange?.(nextOpen)
	}, [onOpenChange, open])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault()
				setOpen(true)
			}
			if (e.key === "Escape") {
				setOpen(false)
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [setOpen])

	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus()
		}
	}, [isOpen])

	useEffect(() => {
		const normalizedQuery = query.trim().toLowerCase()
		if (!normalizedQuery) {
			setSuggestions([])
			return
		}

		const pageSuggestions: SearchSuggestion[] = publicPages
			.filter((page) => `${page.text} ${page.description} ${page.keywords}`.toLowerCase().includes(normalizedQuery))
			.slice(0, 4)
			.map((page) => ({ type: "page", text: page.text, href: getStoreRouteHref(store, page.href), description: page.description }))

		const controller = new AbortController()
		const loadSuggestions = async () => {
			try {
				const response = await fetch(getStoreRouteHref(store, `/api/products?q=${encodeURIComponent(query)}&limit=6`), {
					signal: controller.signal,
					cache: "no-store",
				})
				if (!response.ok) throw new Error("Search failed")
				const data: { products?: ProductSearchResult[] } = await response.json()
				const products: SearchSuggestion[] = (data.products || []).map((product) => ({
					type: "product",
					text: product.name,
					href: getStoreRouteHref(store, `/products/${product.slug}`),
					image: product.images?.[0],
					price: product.discountedPrice ?? product.price,
				}))
				setSuggestions([...pageSuggestions, ...products].slice(0, 8))
			} catch (error) {
				if ((error as Error).name !== "AbortError") setSuggestions(pageSuggestions)
			}
		}
		const debounce = window.setTimeout(loadSuggestions, 150)
		return () => {
			window.clearTimeout(debounce)
			controller.abort()
		}
	}, [query, store])

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
				setOpen(false)
			} else if (query) {
				router.push(getStoreRouteHref(store, `/products?q=${encodeURIComponent(query)}`))
				setOpen(false)
			}
		}
	}

	return (
		<>
			{showTrigger && (
				<button
					onClick={() => setOpen(true)}
					className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-white/10 text-gray-500 transition hover:text-gray-700 md:h-auto md:w-36 md:justify-start md:gap-2 md:px-3 md:py-2 lg:w-64 lg:px-4 dark:hover:text-gray-300"
					aria-label="Open search"
				>
					<Search size={16} />
					<span className="hidden flex-1 text-left md:block">Search pages &amp; products...</span>
					<kbd className="hidden rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700 md:block">
						⌘K
					</kbd>
				</button>
			)}

			<AnimatePresence>
				{isOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
							onClick={() => setOpen(false)}
						/>
						<motion.div
							initial={{ opacity: 0, y: -20, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -20, scale: 0.95 }}
							className="search-overlay-panel fixed z-[60] max-w-[calc(100vw-1rem)]"
						>
							<div className="glass-card navy-glass p-4">
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
										onClick={() => setOpen(false)}
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
												onClick={() => setOpen(false)}
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
									src={getProductImage(suggestion.image, suggestion.text)}
															alt=""
															fill
															className="object-cover"
														/>
													</div>
												)}
												{suggestion.type === "page" && (
													<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
														<FileText size={18} className="text-primary" />
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
													{suggestion.type === "page" && (
														<p className="text-sm text-gray-500">{suggestion.description}</p>
													)}
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
									href={getStoreRouteHref(store, `/products?q=${encodeURIComponent(search)}`)}
													onClick={() => setOpen(false)}
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
