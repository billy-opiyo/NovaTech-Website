"use client"

import HeroBanner from "@/components/home/HeroBanner"
import CategoryGrid from "@/components/home/CategoryGrid"
import FeaturedProducts from "@/components/home/FeaturedProducts"
import Testimonials from "@/components/home/Testimonials"
import Newsletter from "@/components/home/Newsletter"

export default function HomePage() {
	return (
		<div className="space-y-24">
			<HeroBanner />
			<CategoryGrid />
			<FeaturedProducts />
			<Testimonials />
			<Newsletter />
		</div>
	)
}