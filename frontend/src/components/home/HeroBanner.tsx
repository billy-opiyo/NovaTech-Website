"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function HeroBanner() {
	return (
		<section className="relative rounded-3xl overflow-hidden glass-card p-6 sm:p-8 md:p-16 text-center">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
			>
				<h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
					Upgrade Your Tech
					<span className="block text-primary">With Genuine Deals</span>
				</h1>
				<p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
					Kenya&apos;s most trusted electronics store. Shop latest phones, laptops,
					and accessories with warranty &amp; fast delivery.
				</p>
				<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
					<Link
						href="/category/phones"
						className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
					>
						Shop Phones <ArrowRight size={18} />
					</Link>
					<Link
						href="/deals"
						className="border border-primary text-primary hover:bg-primary hover:text-white px-6 py-2 rounded-lg transition w-full sm:w-auto text-center"
					>
						Today&apos;s Deals
					</Link>
				</div>
			</motion.div>
		</section>
	)
}