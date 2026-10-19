"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

export default function HeroBanner() {
	const store = useStoreContext()
	const platformCopy = {
		title: "Discover Independent Stores",
		highlight: "All in One Place",
		description: "Explore trusted independent stores, compare their collections, and shop from merchants offering the products you need.",
		primaryLabel: "Browse Stores",
		primaryHref: "/stores?all=1",
		secondaryLabel: "Learn About the Platform",
		secondaryHref: "/about",
	}
	const copy = store.isPlatformHome ? platformCopy : {
		title: store.homepage.heroTitle,
		highlight: store.homepage.heroHighlight,
		description: store.homepage.heroDescription,
		primaryLabel: store.homepage.heroPrimaryLabel,
		primaryHref: store.homepage.heroPrimaryHref,
		secondaryLabel: store.homepage.heroSecondaryLabel,
		secondaryHref: store.homepage.heroSecondaryHref,
	}
	return (
		<section data-hero-layout={store.themeLayout?.heroLayout || "centered"} className="relative overflow-hidden rounded-3xl glass-card navy-glass p-6 text-center sm:p-8 md:p-16">
			<motion.div
				className="mx-auto max-w-4xl"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
			>
				<h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
					{copy.title}
					<span className="block text-primary">{copy.highlight}</span>
				</h1>
				<p className="mb-8 mx-auto max-w-2xl text-base text-gray-600 dark:text-gray-300 sm:text-lg md:text-xl">
					{copy.description}
				</p>
				<div className="mx-auto flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
					<Link
						href={getStoreRouteHref(store, copy.primaryHref)}
						className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
					>
						{copy.primaryLabel} <ArrowRight size={18} />
					</Link>
					<Link
						href={getStoreRouteHref(store, copy.secondaryHref)}
						className="border border-primary text-primary hover:bg-primary hover:text-white px-6 py-2 rounded-lg transition w-full sm:w-auto text-center"
					>
						{copy.secondaryLabel}
					</Link>
				</div>
			</motion.div>
		</section>
	)
}
