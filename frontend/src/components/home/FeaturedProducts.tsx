"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"
import { getProductImage } from "@/constants/productImages"

const featuredProducts = [
	{
		id: "iphone-15-pro-max",
		name: "iPhone 15 Pro Max",
		price: 159999,
		discountedPrice: 149999,
		image:
			"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=80",
		rating: 4.8,
	},
	{
		id: "samsung-galaxy-s24-ultra",
		name: "Samsung Galaxy S24 Ultra",
		price: 134999,
		image:
			"https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=700&q=80",
		rating: 4.7,
	},
	{
		id: "macbook-air-m3",
		name: "MacBook Air M3",
		price: 189999,
		discountedPrice: 174999,
		image:
			"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=80",
		rating: 4.9,
	},
	{
		id: "sony-wh-1000xm5",
		name: "Sony WH-1000XM5",
		price: 34999,
		image:
			"https://images.unsplash.com/photo-1512499617640-c2f9993581af?auto=format&fit=crop&w=700&q=80",
		rating: 4.6,
	},
]

export default function FeaturedProducts() {
	return (
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
						<Link href={`/products/${product.id}`} className="glass-card navy-glass block group">
							<div className="relative h-52 w-full mb-4 rounded-xl overflow-hidden">
								<Image
									src={getProductImage(product.image, product.name)}
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
	)
}
