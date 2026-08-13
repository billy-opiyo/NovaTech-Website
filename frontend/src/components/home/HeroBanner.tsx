"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { clientConfig } from "@/config/client.config"

export default function HeroBanner() {
	return (
		<section className="relative rounded-3xl overflow-hidden glass-card p-6 sm:p-8 md:p-16 text-center">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
			>
				<h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
					{clientConfig.homepage.heroTitle}
					<span className="block text-primary">{clientConfig.homepage.heroHighlight}</span>
				</h1>
				<p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
					{clientConfig.homepage.heroDescription}
				</p>
				<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
					<Link
						href={clientConfig.homepage.heroPrimaryHref}
						className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
					>
						{clientConfig.homepage.heroPrimaryLabel} <ArrowRight size={18} />
					</Link>
					<Link
						href={clientConfig.homepage.heroSecondaryHref}
						className="border border-primary text-primary hover:bg-primary hover:text-white px-6 py-2 rounded-lg transition w-full sm:w-auto text-center"
					>
						{clientConfig.homepage.heroSecondaryLabel}
					</Link>
				</div>
			</motion.div>
		</section>
	)
}
