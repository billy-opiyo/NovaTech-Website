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
				image:
					"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
				slug: "iphone",
			},
			{
				name: "Samsung Galaxy",
				image:
					"https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=800&q=80",
				slug: "samsung",
			},
			{
				name: "Google Pixel",
				image:
					"https://images.unsplash.com/photo-1510557880182-3ef88e0b9da8?auto=format&fit=crop&w=800&q=80",
				slug: "pixel",
			},
			{
				name: "OnePlus",
				image:
					"https://images.unsplash.com/photo-1512499617640-c2f9993581af?auto=format&fit=crop&w=800&q=80",
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
				image:
					"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
				slug: "macbook",
			},
			{
				name: "Dell",
				image:
					"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
				slug: "dell",
			},
			{
				name: "HP",
				image:
					"https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80",
				slug: "hp",
			},
			{
				name: "Gaming Laptops",
				image:
					"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
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
				image:
					"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
				slug: "ipad",
			},
			{
				name: "Samsung Galaxy Tab",
				image:
					"https://images.unsplash.com/photo-1555529669-185670d0b904?auto=format&fit=crop&w=800&q=80",
				slug: "galaxy-tab",
			},
			{
				name: "Microsoft Surface",
				image:
					"https://images.unsplash.com/photo-1532124347401-0cca7a27cfe9?auto=format&fit=crop&w=800&q=80",
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
				image:
					"https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=800&q=80",
				slug: "headphones",
			},
			{
				name: "Chargers & Cables",
				image:
					"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
				slug: "chargers",
			},
			{
				name: "Cases & Covers",
				image:
					"https://images.unsplash.com/photo-1496180727794-817822f65950?auto=format&fit=crop&w=800&q=80",
				slug: "cases",
			},
			{
				name: "Smartwatches",
				image:
					"https://images.unsplash.com/photo-1525186402429-7b3aef8d2ca3?auto=format&fit=crop&w=800&q=80",
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
				image:
					"https://images.unsplash.com/photo-1587202372775-f4b746c6bd84?auto=format&fit=crop&w=800&q=80",
				slug: "consoles",
			},
			{
				name: "Gaming PCs",
				image:
					"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
				slug: "gaming-pcs",
			},
			{
				name: "Controllers",
				image:
					"https://images.unsplash.com/photo-1510552776732-03e61cf4b144?auto=format&fit=crop&w=800&q=80",
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
