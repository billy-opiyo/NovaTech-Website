"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { getProductImage } from "@/constants/productImages"
import { clientConfig } from "@/config/client.config"

const categories = [
	{
		name: "Phones",
		image:
			"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
		slug: "phones",
	},
	{
		name: "Laptops",
		image:
			"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
		slug: "laptops",
	},
	{
		name: "Tablets",
		image:
			"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
		slug: "tablets",
	},
	{
		name: "Accessories",
		image:
			"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
		slug: "accessories",
	},
]

export default function CategoryGrid() {
	return (
		<section>
			<h2 className="text-3xl font-bold mb-8 text-center">{clientConfig.homepage.categoryTitle}</h2>
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
									src={getProductImage(cat.image, cat.name)}
									alt={cat.name}
									fill
									className="object-cover group-hover:scale-105 transition-transform duration-500"
								/>
							</div>
							<p className="text-center font-semibold mt-3 text-lg">{cat.name}</p>
						</Link>
					</motion.div>
				))}
			</div>
		</section>
	)
}
