"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"

const categories = [
	{
		name: "Phones",
		image: "https://placehold.co/300x200/0070f3/white?text=Phones",
		slug: "phones",
	},
	{
		name: "Laptops",
		image: "https://placehold.co/300x200/0070f3/white?text=Laptops",
		slug: "laptops",
	},
	{
		name: "Tablets",
		image: "https://placehold.co/300x200/0070f3/white?text=Tablets",
		slug: "tablets",
	},
	{
		name: "Accessories",
		image: "https://placehold.co/300x200/0070f3/white?text=Accessories",
		slug: "accessories",
	},
]

const featuredProducts = [
	{
		id: "1",
		name: "iPhone 15 Pro Max",
		price: 159999,
		discountedPrice: 149999,
		image: "https://placehold.co/300x300/1e293b/white?text=iPhone+15",
		rating: 4.8,
	},
	{
		id: "2",
		name: "Samsung Galaxy S24 Ultra",
		price: 134999,
		image: "https://placehold.co/300x300/1e293b/white?text=Galaxy+S24",
		rating: 4.7,
	},
	{
		id: "3",
		name: "MacBook Air M3",
		price: 189999,
		discountedPrice: 174999,
		image: "https://placehold.co/300x300/1e293b/white?text=MacBook+Air",
		rating: 4.9,
	},
	{
		id: "4",
		name: "Sony WH-1000XM5",
		price: 34999,
		image: "https://placehold.co/300x300/1e293b/white?text=Sony+WH",
		rating: 4.6,
	},
]

const testimonials = [
	{
		name: "Jane M.",
		text: "Great service, genuine products. My laptop arrived in 2 days!",
		role: "Customer",
	},
	{
		name: "Brian K.",
		text: "Best electronics shop in Nairobi. Highly recommended.",
		role: "Customer",
	},
]

export default function HomePage() {
	return (
		<div className="space-y-24">
			{/* Hero Banner */}
			<section className="relative rounded-3xl overflow-hidden glass-card p-6 sm:p-8 md:p-16 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
				>
					<h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
						Upgrade Your Tech
						<span className="block text-primary">With Genuine Deals</span>
					</h1>
					<p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
						Kenya’s most trusted electronics store. Shop latest phones, laptops,
						and accessories with warranty & fast delivery.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
						<Link
							href="/category/phones"
							className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
						>
							Shop Phones <ArrowRight size={18} />
						</Link>
						<Link
							href="/deals"
							className="border border-primary text-primary hover:bg-primary hover:text-white px-6 py-2 rounded-lg transition w-full sm:w-auto text-center"
						>
							Today&apos;s Deals
						</Link>
					</div>
				</motion.div>
			</section>

			{/* Categories */}
			<section>
				<h2 className="text-3xl font-bold mb-8 text-center">
					Shop by Category
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
					{categories.map((cat, i) => (
						<motion.div
							key={cat.slug}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.1 }}
						>
							<Link
								href={`/category/${cat.slug}`}
								className="glass-card block overflow-hidden group"
							>
								<div className="relative h-40 w-full">
									<Image
										src={cat.image}
										alt={cat.name}
										fill
										className="object-cover group-hover:scale-105 transition-transform duration-500"
									/>
								</div>
								<p className="text-center font-semibold mt-3 text-lg">
									{cat.name}
								</p>
							</Link>
						</motion.div>
					))}
				</div>
			</section>

			{/* Featured Products */}
			<section>
				<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8">
					<h2 className="text-2xl sm:text-3xl font-bold">Featured Products</h2>
					<Link
						href="/products"
						className="text-primary hover:underline flex items-center gap-1"
					>
						View All <ArrowRight size={16} />
					</Link>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
					{featuredProducts.map((product, i) => (
						<motion.div
							key={product.id}
							initial={{ opacity: 0, scale: 0.9 }}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.1 }}
						>
							<Link
								href={`/products/${product.id}`}
								className="glass-card block group"
							>
								<div className="relative h-52 w-full mb-4 rounded-xl overflow-hidden">
									<Image
										src={product.image}
										alt={product.name}
										fill
										className="object-cover group-hover:scale-105 transition-transform duration-500"
									/>
								</div>
								<h3 className="font-semibold truncate">{product.name}</h3>
								<div className="flex items-center gap-1 mt-1">
									<Star size={14} className="text-yellow-500 fill-yellow-500" />
									<span className="text-sm">{product.rating}</span>
								</div>
								<div className="mt-2 flex items-baseline gap-2">
									{product.discountedPrice ? (
										<>
											<span className="text-lg font-bold">
												KES {product.discountedPrice.toLocaleString()}
											</span>
											<span className="text-sm line-through text-gray-400">
												KES {product.price.toLocaleString()}
											</span>
										</>
									) : (
										<span className="text-lg font-bold">
											KES {product.price.toLocaleString()}
										</span>
									)}
								</div>
							</Link>
						</motion.div>
					))}
				</div>
			</section>

			{/* Testimonials */}
			<section>
				<h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
					What Our Customers Say
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{testimonials.map((t, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							className="glass-card p-6"
						>
							<p className="text-gray-600 dark:text-gray-300 italic mb-4">
								"{t.text}"
							</p>
							<div>
								<p className="font-semibold">{t.name}</p>
								<p className="text-sm text-gray-500">{t.role}</p>
							</div>
						</motion.div>
					))}
				</div>
			</section>

			{/* Newsletter */}
			<section className="glass-card p-6 sm:p-8 text-center">
				<h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
				<p className="text-gray-600 dark:text-gray-300 mb-6">
					Get exclusive deals and new arrivals straight to your inbox.
				</p>
				<form className="flex flex-col sm:flex-row max-w-md mx-auto gap-2">
					<input
						type="email"
						placeholder="you@example.com"
						className="flex-1 px-4 py-2 rounded-lg bg-white/20 dark:bg-black/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
					/>
					<button type="submit" className="btn-primary w-full sm:w-auto">
						Subscribe
					</button>
				</form>
			</section>
		</div>
	)
}
