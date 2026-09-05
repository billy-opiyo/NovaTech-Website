"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { getProductImage } from "@/constants/productImages"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

export default function CategoryGrid() {
	const store = useStoreContext()
	return (
		<section>
			<h2 className="text-3xl font-bold mb-8 text-center">
				{store.homepage.categoryTitle}
			</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
				{store.homepage.categories.map((cat, i) => (
					<motion.div
						key={cat.slug}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: i * 0.1 }}
					>
						<Link
							href={getStoreRouteHref(store, `/category/${cat.slug}`)}
							className="glass-card navy-glass group block min-h-[22rem] overflow-hidden sm:min-h-0"
						>
							<div className="relative h-80 w-full sm:h-40">
								<Image
									src={
										cat.image?.startsWith("https://images.unsplash.com/")
											? getProductImage(cat.image)
											: cat.image
									}
									alt={cat.name}
									fill
									className="object-contain transition-transform duration-500 group-hover:scale-105 sm:object-cover"
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
	)
}
