"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Boxes } from "lucide-react"
import { fallbackToProductPlaceholder, getCategoryCardImage } from "@/constants/productImages"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

type StoreCategory = ReturnType<typeof useStoreContext>["homepage"]["categories"][number]

export default function CategoryGrid() {
	const store = useStoreContext()
	const isPlatformStore = store.ownerType === "PLATFORM"
	const groups = new Map<string, { name: string; categories: StoreCategory[] }>()
	for (const category of store.homepage.categories) {
		const industrySlug = category.industrySlug || store.industry?.slug || "store"
		const industryName = category.industryName || store.industry?.name || store.brand.name
		const group = groups.get(industrySlug) || { name: industryName, categories: [] }
		group.categories.push(category)
		groups.set(industrySlug, group)
	}
	const categoryGroups = Array.from(groups.entries())

	function renderCards(categories: StoreCategory[], groupKey: string) {
		return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
			{categories.map((category, index) => {
				const industrySlug = category.industrySlug || store.industry?.slug
				const href = isPlatformStore && industrySlug
					? `/products?industry=${encodeURIComponent(industrySlug)}&category=${encodeURIComponent(category.slug)}`
					: `/category/${encodeURIComponent(category.slug)}`
				return <motion.div
					key={`${groupKey}:${category.slug}`}
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: index * 0.08 }}
				>
					<Link href={getStoreRouteHref(store, href)} className="glass-card navy-glass group block min-h-[22rem] overflow-hidden sm:min-h-0">
						<div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-theme-surface">
							{category.image ? <img
								src={getCategoryCardImage(category.image, category.name, industrySlug)}
								alt={category.name}
								onError={fallbackToProductPlaceholder}
								className="block h-full w-full rounded-xl object-cover transition-transform duration-500 lg:group-hover:scale-105"
							/> : <div className="grid h-full w-full place-items-center rounded-xl bg-primary/5 text-primary"><Boxes size={42} aria-hidden="true"/><span className="sr-only">{category.name}</span></div>}
						</div>
						<p className="mt-3 text-center text-lg font-semibold">{category.name}</p>
					</Link>
				</motion.div>
			})}
		</div>
	}

	return <section aria-labelledby="shop-by-category-heading" className="space-y-8">
		<h2 id="shop-by-category-heading" className="mb-8 text-center text-3xl font-bold">
			{isPlatformStore ? "Shop by Category" : store.homepage.categoryTitle}
		</h2>
		{isPlatformStore
			? categoryGroups.map(([industrySlug, group]) => <section key={industrySlug} aria-labelledby={`category-group-${industrySlug}`} className="space-y-4">
				<h3 id={`category-group-${industrySlug}`} className="text-center text-xl font-semibold text-theme-text">{group.name}</h3>
				{renderCards(group.categories, industrySlug)}
			</section>)
			: renderCards(store.homepage.categories, store.industry?.slug || "store")}
	</section>
}
