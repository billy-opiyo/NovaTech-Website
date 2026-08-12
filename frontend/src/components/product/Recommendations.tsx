"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Star, Sparkles, TrendingUp, Eye } from "lucide-react"
import { getProductImage } from "@/constants/productImages"

interface RecommendedProduct {
	id: string
	name: string
	brand: string
	image: string
	price: number
	discountedPrice?: number
	rating: number
	reason: string
}

export function RecommendedForYou() {
	const [products, setProducts] = useState<RecommendedProduct[]>([])

	useEffect(() => {
		setProducts([
			{
				id: "rec-1",
				name: "Samsung Galaxy S24 Ultra",
				brand: "Samsung",
				image:
					"https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=600&q=80",
				price: 134999,
				rating: 4.7,
				reason: "Based on your phone searches",
			},
			{
				id: "rec-2",
				name: "AirPods Pro 2",
				brand: "Apple",
				image:
					"https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=600&q=80",
				price: 32999,
				discountedPrice: 29999,
				rating: 4.8,
				reason: "Frequently bought with MacBook",
			},
			{
				id: "rec-3",
				name: 'Samsung 65" OLED TV',
				brand: "Samsung",
				image:
					"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
				price: 199999,
				rating: 4.6,
				reason: "Customers also viewed",
			},
			{
				id: "rec-4",
				name: "Logitech MX Master 3S",
				brand: "Logitech",
				image:
					"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
				price: 14999,
				rating: 4.9,
				reason: "Popular in accessories",
			},
		])
	}, [])

	return (
		<section className="mb-16">
			<div className="flex items-center gap-2 mb-6">
				<Sparkles className="text-primary" size={24} />
				<h2 className="text-2xl font-bold">Recommended for You</h2>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
				{products.map((product, i) => (
					<motion.div
						key={product.id}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: i * 0.1 }}
					>
						<Link
							href={`/products/${product.id}`}
							className="glass-card block group"
						>
							<div className="relative h-48 w-full rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
								<Image
									src={getProductImage(product.image, product.name)}
									alt={product.name}
									fill
									className="object-cover group-hover:scale-105 transition-transform duration-500"
								/>
								{product.discountedPrice && (
									<span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
										SALE
									</span>
								)}
							</div>
							<p className="text-xs text-gray-500 uppercase tracking-wider">
								{product.brand}
							</p>
							<h3 className="font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">
								{product.name}
							</h3>
							<div className="flex items-center gap-1 mb-2">
								<Star size={12} className="text-yellow-500 fill-yellow-500" />
								<span className="text-sm">{product.rating}</span>
							</div>
							<div className="flex items-baseline gap-2 mb-2">
								{product.discountedPrice ? (
									<>
										<span className="font-bold">
											KES {product.discountedPrice.toLocaleString()}
										</span>
										<span className="text-xs line-through text-gray-400">
											KES {product.price.toLocaleString()}
										</span>
									</>
								) : (
									<span className="font-bold">
										KES {product.price.toLocaleString()}
									</span>
								)}
							</div>
							<p className="text-xs text-gray-500 flex items-center gap-1">
								<Sparkles size={12} className="text-primary" /> {product.reason}
							</p>
						</Link>
					</motion.div>
				))}
			</div>
		</section>
	)
}

export function RecentlyViewed() {
	const [products, setProducts] = useState<RecommendedProduct[]>([])

	useEffect(() => {
		const stored = localStorage.getItem("recentlyViewed")
		if (stored) {
			try {
				setProducts(JSON.parse(stored))
			} catch (e) {
				console.error("Failed to parse recently viewed:", e)
			}
		}
	}, [])

	if (products.length === 0) return null

	return (
		<section className="mb-16">
			<div className="flex items-center gap-2 mb-6">
				<Eye className="text-primary" size={24} />
				<h2 className="text-2xl font-bold">Recently Viewed</h2>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
				{products.slice(0, 4).map((product, i) => (
					<motion.div
						key={product.id}
						initial={{ opacity: 0, x: -20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ delay: i * 0.1 }}
					>
						<Link
							href={`/products/${product.id}`}
							className="glass-card block group"
						>
							<div className="relative h-40 w-full rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800">
								<Image
									src={getProductImage(product.image, product.name)}
									alt={product.name}
									fill
									className="object-cover group-hover:scale-105 transition-transform duration-500"
								/>
							</div>
							<p className="text-xs text-gray-500 uppercase tracking-wider">
								{product.brand}
							</p>
							<h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
								{product.name}
							</h3>
							<p className="font-bold text-sm mt-1">
								KES{" "}
								{(product.discountedPrice || product.price).toLocaleString()}
							</p>
						</Link>
					</motion.div>
				))}
			</div>
		</section>
	)
}

export function TrendingNow() {
	const [products, setProducts] = useState<RecommendedProduct[]>([])

	useEffect(() => {
		setProducts([
			{
				id: "trend-1",
				name: "iPhone 15 Pro Max",
				brand: "Apple",
				image:
					"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
				price: 159999,
				discountedPrice: 149999,
				rating: 4.8,
				reason: "🔥 Trending #1 in Phones",
			},
			{
				id: "trend-2",
				name: "MacBook Air M3",
				brand: "Apple",
				image:
					"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
				price: 189999,
				discountedPrice: 174999,
				rating: 4.9,
				reason: "🚀 Trending #1 in Laptops",
			},
			{
				id: "trend-3",
				name: "Sony WH-1000XM5",
				brand: "Sony",
				image:
					"https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=600&q=80",
				price: 34999,
				rating: 4.6,
				reason: "💥 Trending in Audio",
			},
			{
				id: "trend-4",
				name: "PlayStation 5",
				brand: "Sony",
				image:
					"https://images.unsplash.com/photo-1587202372775-f4b746c6bd84?auto=format&fit=crop&w=600&q=80",
				price: 74999,
				rating: 4.9,
				reason: "🎮 Hot in Gaming",
			},
		])
	}, [])

	return (
		<section className="mb-16">
			<div className="flex items-center gap-2 mb-6">
				<TrendingUp className="text-accent" size={24} />
				<h2 className="text-2xl font-bold">Trending Now</h2>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
				{products.map((product, i) => (
					<motion.div
						key={product.id}
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ delay: i * 0.1 }}
					>
						<Link
							href={`/products/${product.id}`}
							className="glass-card block group border-2 border-transparent hover:border-accent/30 transition"
						>
							<div className="relative h-48 w-full rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
								<Image
									src={getProductImage(product.image, product.name)}
									alt={product.name}
									fill
									className="object-cover group-hover:scale-105 transition-transform duration-500"
								/>
							</div>
							<h3 className="font-semibold mb-1 line-clamp-1">
								{product.name}
							</h3>
							<div className="flex items-baseline gap-2 mb-2">
								{product.discountedPrice ? (
									<>
										<span className="font-bold text-lg">
											KES {product.discountedPrice.toLocaleString()}
										</span>
										<span className="text-sm line-through text-gray-400">
											KES {product.price.toLocaleString()}
										</span>
									</>
								) : (
									<span className="font-bold text-lg">
										KES {product.price.toLocaleString()}
									</span>
								)}
							</div>
							<p className="text-xs text-gray-500">{product.reason}</p>
						</Link>
					</motion.div>
				))}
			</div>
		</section>
	)
}
