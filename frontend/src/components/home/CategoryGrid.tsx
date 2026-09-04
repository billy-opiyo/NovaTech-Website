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
			<h2 className="text-3xl font-bold mb-8 text-center">{store.homepage.categoryTitle}</h2>
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
							className="glass-card navy-glass block overflow-hidden group"
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
