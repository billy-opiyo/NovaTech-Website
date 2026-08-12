"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowRight, Star } from "lucide-react"
import { getProductImage } from "@/constants/productImages"
import NotFoundState from "@/components/content/NotFoundState"

const categoryData: Record<
	string,
	{
		title: string
		description: string
		trendingProducts: {
			id: string
			name: string
			price: number
			image: string
			href: string
		}[]
		subcategories: { name: string; image: string; slug: string }[]
	}
> = {
	phones: {
		title: "Smartphones",
		description:
			"Discover the latest smartphones from top brands. 5G, great cameras, and amazing deals.",
		trendingProducts: [
			{
				id: "trend-1",
				name: "iPhone 15 Pro Max",
				price: 159999,
				image:
					"https://images.unsplash.com/photo-1696446701796-da75a6db0f7d?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=phones&subcategory=iphone",
			},
			{
				id: "trend-2",
				name: "Samsung Galaxy S24 Ultra",
				price: 134999,
				image:
					"https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=phones&subcategory=samsung",
			},
			{
				id: "trend-3",
				name: "Google Pixel 8 Pro",
				price: 124999,
				image:
					"https://images.unsplash.com/photo-1598327105666-5b89351aff31?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=phones&subcategory=pixel",
			},
			{
				id: "trend-4",
				name: "OnePlus 12",
				price: 89999,
				image:
					"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=phones&subcategory=oneplus",
			},
		],
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
		trendingProducts: [
			{
				id: "trend-5",
				name: "MacBook Air M3",
				price: 189999,
				image:
					"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=laptops&subcategory=macbook",
			},
			{
				id: "trend-6",
				name: "Dell XPS 15",
				price: 179999,
				image:
					"https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=laptops&subcategory=dell",
			},
			{
				id: "trend-7",
				name: "HP Spectre x360",
				price: 169999,
				image:
					"https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=laptops&subcategory=hp",
			},
			{
				id: "trend-8",
				name: "ASUS ROG Strix G16",
				price: 219999,
				image:
					"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=laptops&subcategory=gaming-laptops",
			},
		],
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
		trendingProducts: [
			{
				id: "trend-9",
				name: "iPad Pro M2",
				price: 149999,
				image:
					"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=tablets&subcategory=ipad",
			},
			{
				id: "trend-10",
				name: "Samsung Galaxy Tab S9",
				price: 119999,
				image:
					"https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=tablets&subcategory=galaxy-tab",
			},
			{
				id: "trend-11",
				name: "Microsoft Surface Pro 9",
				price: 139999,
				image:
					"https://images.unsplash.com/photo-1632846708552-0e0c8c7c1c0e?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=tablets&subcategory=surface",
			},
		],
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
		trendingProducts: [
			{
				id: "trend-12",
				name: "Sony WH-1000XM5",
				price: 34999,
				image:
					"https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=accessories&subcategory=headphones",
			},
			{
				id: "trend-13",
				name: "Apple Watch Ultra 2",
				price: 79999,
				image:
					"https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=accessories&subcategory=smartwatches",
			},
			{
				id: "trend-14",
				name: "Anker 65W Charger",
				price: 4999,
				image:
					"https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=accessories&subcategory=chargers",
			},
			{
				id: "trend-15",
				name: "Spigen Phone Case",
				price: 2999,
				image:
					"https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=accessories&subcategory=cases",
			},
		],
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
		trendingProducts: [
			{
				id: "trend-16",
				name: "PlayStation 5",
				price: 79999,
				image:
					"https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=gaming&subcategory=consoles",
			},
			{
				id: "trend-17",
				name: "Nintendo Switch OLED",
				price: 54999,
				image:
					"https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=gaming&subcategory=consoles",
			},
			{
				id: "trend-18",
				name: "Xbox Series X",
				price: 74999,
				image:
					"https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=gaming&subcategory=consoles",
			},
			{
				id: "trend-19",
				name: "Logitech G Pro X",
				price: 12999,
				image:
					"https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80",
				href: "/products?category=gaming&subcategory=controllers",
			},
		],
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
		trendingProducts: [],
		subcategories: [],
	}
	if (!categoryData[slug]) return <NotFoundState title="Category not found" description="That product category is not available. Explore the full NovaTech Store catalogue instead." />
	const trendingProducts = categoryData[slug]?.trendingProducts || []

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
									src={getProductImage(sub.image, sub.name)}
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
					{trendingProducts.map((product) => (
						<Link
							key={product.id}
							href={product.href}
							className="glass-card block group"
						>
							<div className="relative h-40 w-full rounded-xl overflow-hidden mb-4">
								<Image
									src={getProductImage(product.image, product.name)}
									alt={product.name}
									fill
									className="object-cover group-hover:scale-105 transition-transform duration-500"
								/>
							</div>
							<h3 className="font-medium mb-2 group-hover:text-primary transition-colors">
								{product.name}
							</h3>
							<p className="text-primary font-semibold">
								KES {product.price.toLocaleString()}
							</p>
						</Link>
					))}
				</div>
			</section>
		</div>
	)
}
