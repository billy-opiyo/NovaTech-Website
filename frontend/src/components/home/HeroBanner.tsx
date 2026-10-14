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
		<section data-hero-layout={store.themeLayout?.heroLayout || "centered"} className="relative isolate min-h-[24rem] overflow-hidden rounded-3xl glass-card navy-glass p-6 text-center sm:p-8 md:p-16">
			{!store.isPlatformHome && store.homepage.heroImage && <>
				<img src={store.homepage.heroImage} alt={store.homepage.heroImageAlt || ""} className="absolute inset-0 z-0 h-full w-full object-cover" fetchPriority="high" />
				<div className="absolute inset-0 z-0 bg-gradient-to-r from-black/75 via-black/50 to-black/30 backdrop-blur-[1px]" aria-hidden="true" />
			</>}
			<motion.div
				className="relative z-10 mx-auto max-w-4xl rounded-3xl border border-white/20 bg-black/25 p-5 shadow-2xl backdrop-blur-md sm:p-8"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
			>
				<h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
					{copy.title}
					<span className="block text-primary">{copy.highlight}</span>
				</h1>
				<p className={`mb-8 mx-auto max-w-2xl text-base sm:text-lg md:text-xl ${!store.isPlatformHome && store.homepage.heroImage ? "text-white/90" : "text-gray-600 dark:text-gray-300"}`}>
					{copy.description}
				</p>
				<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
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
