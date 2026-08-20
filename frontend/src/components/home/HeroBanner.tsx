"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useStoreContext } from "@/lib/store-context"

export default function HeroBanner() {
	const store = useStoreContext()
	const platformCopy = {
		title: "Discover Electronics Stores",
		highlight: "All in One Place",
		description: "Explore trusted independent electronics stores, compare their collections, and enter the store that has what you need.",
		primaryLabel: "Browse Stores",
		primaryHref: "/stores?all=1",
		secondaryLabel: "Learn About Nurava Tech",
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
		<section className="relative rounded-3xl overflow-hidden glass-card navy-glass p-6 sm:p-8 md:p-16 text-center">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
			>
				<h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
					{copy.title}
					<span className="block text-primary">{copy.highlight}</span>
				</h1>
				<p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
					{copy.description}
				</p>
				<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
					<Link
						href={copy.primaryHref}
						className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
					>
						{copy.primaryLabel} <ArrowRight size={18} />
					</Link>
					<Link
						href={copy.secondaryHref}
						className="border border-primary text-primary hover:bg-primary hover:text-white px-6 py-2 rounded-lg transition w-full sm:w-auto text-center"
					>
						{copy.secondaryLabel}
					</Link>
				</div>
			</motion.div>
		</section>
	)
}
