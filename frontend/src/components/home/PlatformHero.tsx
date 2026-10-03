"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeftRight, ArrowRight, ChevronDown, Search, ShoppingBag, ShoppingCart, Star, Store } from "lucide-react"
import { useTheme } from "@/components/providers/ThemeProvider"
import type { PlatformDiscoveryStore } from "@/lib/store-directory.server"

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

type HeroStore = Pick<PlatformDiscoveryStore, "id" | "name" | "logoUrl" | "averageRating" | "reviewCount" | "industry" | "isDemo"> & {
	href: string
	productCount?: number
	fallbackColor?: string
}

const fallbackStores: HeroStore[] = [
	{ id: "fallback-gadget-galaxy", name: "Gadget Galaxy", logoUrl: null, averageRating: 0, reviewCount: 0, href: "/stores?all=1", fallbackColor: "#1677ff", industry: { name: "Electronics", slug: "electronics" }, isDemo: false },
	{ id: "fallback-techhub", name: "TechHub Electronics", logoUrl: null, averageRating: 0, reviewCount: 0, href: "/stores?all=1", fallbackColor: "#a855f7", industry: { name: "Electronics", slug: "electronics" }, isDemo: false },
	{ id: "fallback-digital-zone", name: "Digital Zone", logoUrl: null, averageRating: 0, reviewCount: 0, href: "/stores?all=1", fallbackColor: "#f97316", industry: { name: "Electronics", slug: "electronics" }, isDemo: false },
]

const trustItems = [
	{ title: "We don't sell.", text: "We empower stores to sell better.", icon: Store },
	{ title: "Discover", text: "Explore products from multiple trusted stores.", icon: Search },
	{ title: "Compare", text: "Compare prices, offers and store ratings.", icon: ArrowLeftRight },
	{ title: "Choose", text: "Select the best store that suits you.", icon: ShoppingCart },
	{ title: "Buy from Store", text: "Complete your purchase directly on the store's site.", icon: ShoppingBag },
]

function getHeroStores(stores: HeroStore[]): HeroStore[] {
	if (!stores.length) return []

	return [...stores]
		.sort((left, right) => Number(right.isDemo) - Number(left.isDemo) || right.averageRating - left.averageRating || right.reviewCount - left.reviewCount || (right.productCount || 0) - (left.productCount || 0))
		.slice(0, 3)
}

function StoreCard({ store, isLight }: { store: HeroStore; isLight: boolean }) {
	const initials = store.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()
	return (
		<a
			href={store.href}
			className={`group flex min-h-28 items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg ${isLight ? "border-blue-200 bg-white" : "border-white/15 bg-[#061427]"}`}
		>
			<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/80 p-2 dark:bg-white/10">
				{store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-lg font-extrabold" style={{ color: store.fallbackColor }}>{initials}</span>}
			</div>
			<div className="min-w-0">
				<h3 className={`break-words text-lg font-bold leading-tight group-hover:text-primary ${isLight ? "text-[#172554]" : "text-white"}`}>{store.name}</h3>
				<p className={`mt-2 flex items-center gap-1 text-sm ${isLight ? "text-[#172554]/75" : "text-white/75"}`}><Star size={14} className="fill-current text-yellow-400" /> {store.averageRating > 0 ? store.averageRating.toFixed(1) : "New"}{store.reviewCount > 0 ? ` · ${store.reviewCount} reviews` : ""}{store.industry && ` · ${store.industry.name}`}</p>
				{store.isDemo && <span className="mt-2 inline-flex rounded-full bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">Platform demo</span>}
			</div>
		</a>
	)
}

function TrustStrip({ isLight }: { isLight: boolean }) {
	return (
		<div className="grid gap-3 lg:grid-cols-5">
			{trustItems.map(({ title, text, icon: Icon }) => (
				<div key={title} className={`flex items-start gap-3 rounded-xl border p-4 ${isLight ? "border-blue-200 bg-white/70" : "border-white/10 bg-white/[0.04]"}`}>
					<Icon className="mt-0.5 shrink-0 text-primary" size={24} />
					<div><p className="font-bold text-primary">{title}</p><p className={`mt-1 text-sm leading-5 ${isLight ? "text-[#172554]" : "text-white/80"}`}>{text}</p></div>
				</div>
			))}
		</div>
	)
}

function HeroArtwork({ theme }: { theme: "dark" | "light" }) {
	const images = heroImages[theme]
	const isLight = theme === "light"
	const artworkAspect = isLight ? "aspect-[1024/1060] lg:aspect-[1672/760]" : "aspect-[944/1288] lg:aspect-[1672/760]"
  const maskBackground = isLight
    ? "linear-gradient(180deg, #fdfdfd 0%, #f8fbff 100%)"
    : "radial-gradient(120% 100% at 100% 0%, #032e5e 0%, rgba(3, 46, 94, 0.42) 38%, rgba(3, 46, 94, 0) 72%), radial-gradient(130% 120% at 100% 100%, #022045 0%, rgba(2, 32, 69, 0) 75%), linear-gradient(180deg, #000b1c 0%, #03182d 100%)"
	return (
		<div className={`relative ${artworkAspect} w-full overflow-hidden rounded-3xl shadow-2xl shadow-primary/10 ${isLight ? "bg-[#f8fbff]" : "bg-[#020a18]"}`}>
			<picture className="absolute inset-0 block">
				<source media="(max-width: 1023px)" srcSet={images.mobile} />
				<img src={images.desktop} alt="" className="absolute left-0 top-0 h-auto w-full max-w-none" />
			</picture>
			{/* The desktop composite contains the old left-side store panel. The artwork-only crop keeps the device montage while removing that embedded content. */}
			<div className={`absolute bottom-0 left-0 hidden w-[46%] lg:block ${isLight ? "top-[75%]" : "top-[65%]"}`} style={{ background: maskBackground }} aria-hidden="true" />
		</div>
	)
}

export default function PlatformHero({ stores }: { stores: Array<PlatformDiscoveryStore & { href: string }> }) {
	const { theme } = useTheme()
	const isLight = theme === "light"
	const [industrySlug, setIndustrySlug] = useState("all")
	const availableStores: HeroStore[] = stores.length ? stores : fallbackStores
	const industries = Array.from(new Map(availableStores.flatMap((store) => store.industry ? [[store.industry.slug, store.industry.name] as const] : [])).entries()).sort((left, right) => left[1].localeCompare(right[1]))
	const filteredStores = industrySlug === "all" ? availableStores : availableStores.filter((store) => store.industry?.slug === industrySlug)
	const heroStores = getHeroStores(filteredStores)

	return (
		<section aria-labelledby="platform-hero-title" className="space-y-5">
			<h1 id="platform-hero-title" className="sr-only">One Platform. Many Trusted Stores. Endless Choices.</h1>
			<HeroArtwork theme={theme} />
			<section className={`rounded-3xl border p-5 shadow-xl sm:p-8 ${isLight ? "border-blue-200 bg-[#edf6ff]" : "border-white/15 bg-[#071a2c]"}`}>
				<div className="text-center">
					<h2 className={`text-2xl font-extrabold sm:text-3xl ${isLight ? "text-[#172554]" : "text-white"}`}>Top Available Stores</h2>
					<p className={`mx-auto mt-2 max-w-2xl text-sm sm:text-base ${isLight ? "text-[#172554]/75" : "text-white/75"}`}>Browse verified independent stores by the kind of products they offer.</p>
				</div>
				<div className="mt-5 flex justify-center">
					<label className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-xl transition focus-within:ring-2 focus-within:ring-primary/35 ${isLight ? "border-blue-200 bg-white/80 text-[#172554]" : "border-white/15 bg-[#041326]/75 text-white"}`}>
						<span className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Industry</span>
						<span className="relative">
							<select
								aria-label="Filter top available stores by industry"
								value={industrySlug}
								onChange={(event) => setIndustrySlug(event.target.value)}
								className={`min-w-36 appearance-none rounded-xl border px-4 py-2.5 pr-10 text-sm font-semibold shadow-inner outline-none transition focus:border-primary ${isLight ? "border-blue-200 bg-[#f5f9ff] text-[#172554] hover:bg-blue-50" : "border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]"}`}
								style={{ colorScheme: isLight ? "light" : "dark" }}
							>
								<option value="all">All industries</option>
								{industries.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
							</select>
							<ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary" />
						</span>
					</label>
				</div>
				{heroStores.length ? <div className="mt-6 grid gap-4 lg:grid-cols-3">{heroStores.map((store) => <StoreCard key={store.id} store={store} isLight={isLight} />)}</div> : <p className="mt-6 rounded-xl border border-white/10 p-6 text-center text-sm text-gray-500">No stores are available in this industry yet.</p>}
				<div className="mt-7 flex justify-center"><Link href="/stores?all=1" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Explore Stores <ArrowRight size={18} /></Link></div>
				<p className={`mt-6 text-center text-sm sm:text-base ${isLight ? "text-[#172554]" : "text-white/85"}`}><span className="font-bold text-primary">Nurava Tech</span><span className="mx-2">—</span>The Marketplace for Electronics Store Partners and Smart Shoppers.</p>
				<div className="mt-8 border-t border-white/10 pt-8"><TrustStrip isLight={isLight} /></div>
			</section>
		</section>
	)
}
