"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowRight, Star } from "lucide-react"

const categoryData: Record<
	string,
	{
		title: string
		description: string
		subcategories: { name: string; image: string; slug: string }[]
	}
> = {
	phones: {
		title: "Smartphones",
		description:
			"Discover the latest smartphones from top brands. 5G, great cameras, and amazing deals.",
		subcategories: [
			{
				name: "iPhone",
				image: "https://placehold.co/400x300/1e293b/white?text=iPhone",
				slug: "iphone",
			},
			{
				name: "Samsung Galaxy",
				image: "https://placehold.co/400x300/1e293b/white?text=Samsung",
				slug: "samsung",
			},
			{
				name: "Google Pixel",
				image: "https://placehold.co/400x300/1e293b/white?text=Pixel",
				slug: "pixel",
			},
			{
				name: "OnePlus",
				image: "https://placehold.co/400x300/1e293b/white?text=OnePlus",
				slug: "oneplus",
			},
		],
	},
	laptops: {
		title: "Laptops",
		description:
			"Powerful laptops for work, gaming, and creativity. Find your perfect match.",
		subcategories: [
			{
				name: "MacBook",
				image: "https://placehold.co/400x300/1e293b/white?text=MacBook",
				slug: "macbook",
			},
			{
				name: "Dell",
				image: "https://placehold.co/400x300/1e293b/white?text=Dell",
				slug: "dell",
			},
			{
				name: "HP",
				image: "https://placehold.co/400x300/1e293b/white?text=HP",
				slug: "hp",
			},
			{
				name: "Gaming Laptops",
				image: "https://placehold.co/400x300/1e293b/white?text=Gaming",
				slug: "gaming-laptops",
			},
		],
	},
	tablets: {
		title: "Tablets",
		description:
			"Versatile tablets for entertainment, productivity, and creativity.",
		subcategories: [
			{
				name: "iPad",
				image: "https://placehold.co/400x300/1e293b/white?text=iPad",
				slug: "ipad",
			},
			{
				name: "Samsung Galaxy Tab",
				image: "https://placehold.co/400x300/1e293b/white?text=Galaxy+Tab",
				slug: "galaxy-tab",
			},
			{
				name: "Microsoft Surface",
				image: "https://placehold.co/400x300/1e293b/white?text=Surface",
				slug: "surface",
			},
		],
	},
	accessories: {
		title: "Accessories",
		description:
			"Essential accessories for your devices. Cases, chargers, headphones, and more.",
		subcategories: [
			{
				name: "Headphones",
				image: "https://placehold.co/400x300/1e293b/white?text=Headphones",
				slug: "headphones",
			},
			{
				name: "Chargers & Cables",
				image: "https://placehold.co/400x300/1e293b/white?text=Chargers",
				slug: "chargers",
			},
			{
				name: "Cases & Covers",
				image: "https://placehold.co/400x300/1e293b/white?text=Cases",
				slug: "cases",
			},
			{
				name: "Smartwatches",
				image: "https://placehold.co/400x300/1e293b/white?text=Watches",
				slug: "smartwatches",
			},
		],
	},
	gaming: {
		title: "Gaming",
		description:
			"Level up your gaming setup with consoles, gaming PCs, and accessories.",
		subcategories: [
			{
				name: "Consoles",
				image: "https://placehold.co/400x300/1e293b/white?text=Consoles",
				slug: "consoles",
			},
			{
				name: "Gaming PCs",
				image: "https://placehold.co/400x300/1e293b/white?text=Gaming+PCs",
				slug: "gaming-pcs",
			},
			{
				name: "Controllers",
				image: "https://placehold.co/400x300/1e293b/white?text=Controllers",
				slug: "controllers",
			},
		],
	},
}

export default function CategoryPage() {
	const { slug } = useParams<{ slug: string }>()
	const category = categoryData[slug] || {
		title: "Category",
		description: "Browse products in this category.",
		subcategories: [],
	}

	return (
		<div>
			{/* Hero */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="glass-card p-8 md:p-16 mb-12 text-center"
			>
				<h1 className="text-3xl md:text-5xl font-bold mb-4">
					{category.title}
				</h1>
				<p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
					{category.description}
				</p>
				<Link
					href={`/products?category=${slug}`}
					className="btn-primary inline-flex items-center gap-2"
				>
					Browse All <ArrowRight size={18} />
				</Link>
			</motion.div>

			{/* Subcategories Grid */}
			<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
				{category.subcategories.map((sub, i) => (
					<motion.div
						key={sub.slug}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: i * 0.1 }}
					>
						<Link
							href={`/products?category=${slug}&subcategory=${sub.slug}`}
							className="glass-card block group overflow-hidden"
						>
							<div className="relative h-52 w-full rounded-xl overflow-hidden mb-4">
								<Image
									src={sub.image}
									alt={sub.name}
									fill
									className="object-cover group-hover:scale-105 transition-transform duration-500"
								/>
							</div>
							<h3 className="text-center font-semibold text-lg group-hover:text-primary transition-colors">
								{sub.name}
							</h3>
						</Link>
					</motion.div>
				))}
			</div>

			{/* Trending in this Category */}
			<section>
				<div className="flex justify-between items-center mb-8">
					<h2 className="text-2xl font-bold">Trending in {category.title}</h2>
					<Link
						href={`/products?category=${slug}&sort=popular`}
						className="text-primary hover:underline flex items-center gap-1"
					>
						View All <ArrowRight size={16} />
					</Link>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="glass-card animate-pulse">
							<div className="h-40 bg-gray-300 dark:bg-gray-600 rounded-xl mb-4" />
							<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2" />
							<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
						</div>
					))}
				</div>
			</section>
		</div>
	)
}
