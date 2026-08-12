"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { getProductImage } from "@/constants/productImages"
import { Star } from "lucide-react"

interface TopProduct {
	id: string
	name: string
	sales: number
	revenue: number
	image: string
	rating: number
}

const topProducts: TopProduct[] = [
	{
		id: "1",
		name: "iPhone 15 Pro Max",
		sales: 145,
		revenue: 23249855,
		image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=100&q=80",
		rating: 4.8,
	},
	{
		id: "2",
		name: "MacBook Air M3",
		sales: 89,
		revenue: 16929911,
		image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=100&q=80",
		rating: 4.9,
	},
	{
		id: "3",
		name: "Samsung Galaxy S24 Ultra",
		sales: 112,
		revenue: 15119888,
		image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=100&q=80",
		rating: 4.7,
	},
	{
		id: "4",
		name: "Sony WH-1000XM5",
		sales: 67,
		revenue: 2344933,
		image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=100&q=80",
		rating: 4.6,
	},
]

export default function TopProducts() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.7 }}
			className="glass-card p-6"
		>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-bold">Top Products</h2>
					<p className="text-sm text-gray-500 mt-1">Best sellers this month</p>
				</div>
			</div>
			<div className="space-y-4">
				{topProducts.map((product, index) => (
					<motion.div
						key={product.id}
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.7 + index * 0.05 }}
						className="flex items-center gap-4"
					>
						<div className="relative h-16 w-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
							<Image
								src={getProductImage(product.image, product.name)}
								alt={product.name}
								fill
								className="object-cover"
							/>
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-sm truncate">{product.name}</p>
							<div className="flex items-center gap-2 mt-1">
								<div className="flex items-center gap-1">
									<Star
										size={12}
										className="text-yellow-500 fill-yellow-500"
									/>
									<span className="text-xs text-gray-500">{product.rating}</span>
								</div>
								<span className="text-xs text-gray-400">
									{product.sales} sales
								</span>
							</div>
							<p className="text-sm font-semibold text-green-600 mt-1">
								KES {(product.revenue / 1000000).toFixed(2)}M
							</p>
						</div>
					</motion.div>
				))}
			</div>
			<button className="w-full mt-4 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm">
				View All Products
			</button>
		</motion.div>
	)
}
