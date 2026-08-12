"use client"

import { motion } from "framer-motion"

const testimonials = [
	{
		name: "Jane M.",
		text: "Great service, genuine products. My laptop arrived in 2 days!",
		role: "Customer",
	},
	{
		name: "Brian K.",
		text: "Best electronics shop in Nairobi. Highly recommended.",
		role: "Customer",
	},
]

export default function Testimonials() {
	return (
		<section>
			<h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
				What Our Customers Say
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{testimonials.map((t, i) => (
					<motion.div
						key={i}
						initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						className="glass-card p-6"
					>
						<p className="text-gray-600 dark:text-gray-300 italic mb-4">"{t.text}"</p>
						<div>
							<p className="font-semibold">{t.name}</p>
							<p className="text-sm text-gray-500">{t.role}</p>
						</div>
					</motion.div>
				))}
			</div>
		</section>
	)
}