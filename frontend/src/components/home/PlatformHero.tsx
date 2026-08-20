"use client"

import Link from "next/link"
import { useTheme } from "@/components/providers/ThemeProvider"

const heroImages = {
	dark: {
		desktop: "/images/Nurava%20Tech%20hero%20desktop-image-ui.png",
		mobile: "/images/Nurava%20Tech%20hero%20mobile-image-ui.png",
	},
	light: {
		desktop: "/images/Nurava%20Tech%20hero%20desktop-image-ui%20light.png",
		mobile: "/images/Nurava%20Tech%20hero%20mobile-image-ui%20light.png",
	},
} as const

export default function PlatformHero() {
	const { theme } = useTheme()
	const images = heroImages[theme]
	const isLight = theme === "light"
	const aspectClass = isLight ? "aspect-[2/3] md:aspect-[3/2]" : "aspect-[944/1672] md:aspect-[1672/941]"

	return (
		<section aria-labelledby="platform-hero-title" className={`relative ${aspectClass} w-full overflow-hidden rounded-3xl bg-[#020a18] shadow-2xl shadow-primary/10`}>
			<h1 id="platform-hero-title" className="sr-only">One Platform. Many Trusted Stores. Endless Choices.</h1>
			<picture key={theme} className="absolute inset-0 block">
				<source media="(max-width: 767px)" srcSet={images.mobile} />
				<img src={images.desktop} alt="" className="h-full w-full object-cover" />
			</picture>
			<Link
				href="/stores?all=1"
				aria-label="Explore Stores"
				className={`absolute ${isLight ? "left-[2.9%] top-[70.7%] h-[4.4%] w-[14.5%]" : "left-[2.9%] top-[75.4%] h-[4.7%] w-[13.3%]"} hidden rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:block`}
			>
				<span className="sr-only">Explore Stores</span>
			</Link>
			<Link
				href="/stores?all=1"
				aria-label="Explore Stores"
				className={`absolute ${isLight ? "left-[3%] top-[90.8%] h-[4.1%] w-[29.6%]" : "left-[5.7%] top-[91.3%] h-[4.2%] w-[30.8%]"} block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden`}
			>
				<span className="sr-only">Explore Stores</span>
			</Link>
		</section>
	)
}
