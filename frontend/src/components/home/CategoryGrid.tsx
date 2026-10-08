"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Boxes } from "lucide-react"
import { fallbackToProductPlaceholder, getCategoryCardImage } from "@/constants/productImages"
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
							<div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-theme-surface">
								{cat.image ? (
									<img
										src={getCategoryCardImage(cat.image, cat.name, store.industry?.slug)}
										alt={cat.name}
										onError={fallbackToProductPlaceholder}
										className="block h-full w-full rounded-xl object-cover transition-transform duration-500 lg:group-hover:scale-105"
									/>
								) : (
									<div className="grid h-full w-full place-items-center rounded-xl bg-primary/5 text-primary">
										<Boxes size={42} aria-hidden="true" />
										<span className="sr-only">{cat.name}</span>
									</div>
								)}
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
