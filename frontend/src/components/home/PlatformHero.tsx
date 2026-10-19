"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeftRight, ArrowRight, ChevronDown, Search, ShoppingBag, ShoppingCart, Star, Store } from "lucide-react"
import { useTheme } from "@/components/providers/ThemeProvider"
import { useStoreContext } from "@/lib/store-context"
import type { PlatformDiscoveryCardKey } from "@/lib/platform-site-settings"
import type { PlatformDiscoveryStore } from "@/lib/store-directory.server"

type HeroStore = Pick<PlatformDiscoveryStore, "id" | "name" | "slug" | "logoUrl" | "averageRating" | "reviewCount" | "industry" | "isDemo"> & {
	href: string
	productCount?: number
	fallbackColor?: string
}

const trustItems = [
	{ id: "businesses", title: "For Businesses", text: "Create, Manage and Grow your Online Store", icon: Store },
	{ id: "customers", title: "For Customers", text: "Discover products from trusted businesses", icon: Search },
	{ id: "compare", title: "Compare", text: "Compare prices, offers and store ratings.", icon: ArrowLeftRight },
	{ id: "choose", title: "Choose", text: "Select the best store that suits you.", icon: ShoppingCart },
	{ id: "buyFromStore", title: "Buy from Store", text: "Complete your purchase directly on the store's site.", icon: ShoppingBag },
]

function getHeroStores(stores: HeroStore[]): HeroStore[] {
	if (!stores.length) return []

	const demoOrder = new Map([["nuravatech", 0], ["nurava-furnitures", 1], ["nurava-cakes", 2], ["nurava-boutiques", 3]])
	return [...stores]
		.sort((left, right) => {
			if (left.isDemo && right.isDemo) return (demoOrder.get(left.slug) ?? 99) - (demoOrder.get(right.slug) ?? 99)
			return Number(right.isDemo) - Number(left.isDemo) || right.averageRating - left.averageRating || right.reviewCount - left.reviewCount || (right.productCount || 0) - (left.productCount || 0)
		})
		.slice(0, 4)
}

function StoreCard({ store }: { store: HeroStore }) {
	return (
		<a
			href={store.href}
			className="group flex min-h-28 items-center gap-4 rounded-2xl border border-theme-border bg-theme-surface p-4 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
		>
			<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/80 p-2 dark:bg-white/10">
				{store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : <Store className="text-primary" size={28} aria-hidden="true" />}
			</div>
			<div className="min-w-0">
				<h3 className="break-words text-lg font-bold leading-tight text-theme-text group-hover:text-primary">{store.name}</h3>
				<p className="mt-2 flex items-center gap-1 text-sm text-theme-muted"><Star size={14} className="fill-current text-yellow-400" /> {store.averageRating > 0 ? store.averageRating.toFixed(1) : "New"}{store.reviewCount > 0 ? ` · ${store.reviewCount} reviews` : ""}{store.industry && ` · ${store.industry.name}`}</p>
				{store.isDemo && <span className="mt-2 inline-flex rounded-full bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">Platform demo</span>}
			</div>
		</a>
	)
}

function TrustStrip() {
	const { platformSettings } = useStoreContext()
	return (
		<div className="grid gap-3 lg:grid-cols-5">
			{trustItems.map(({ id, title: fallbackTitle, text: fallbackText, icon: Icon }) => {
				const copy = platformSettings?.discoveryCards?.[id as PlatformDiscoveryCardKey]
				const title = copy?.title?.trim() || fallbackTitle
				const text = copy?.text?.trim() || fallbackText
				return <div key={id} className="flex items-start gap-3 rounded-xl border border-theme-border bg-theme-surface/80 p-4">
					<Icon className="mt-0.5 shrink-0 text-primary" size={24} />
					<div><p className="font-bold text-primary">{title}</p><p className="mt-1 text-sm leading-5 text-theme-text">{text}</p></div>
				</div>
			})}
		</div>
	)
}

export default function PlatformHero({ stores }: { stores: Array<PlatformDiscoveryStore & { href: string }> }) {
	const { theme } = useTheme()
	const storeContext = useStoreContext()
	const isLight = theme === "light"
	const hero = storeContext.isPlatformHome ? storeContext.platformSettings?.hero : undefined
	const heroTitle = hero?.title?.trim() || "Nurava HubStores is the technology platform"
	const heroHighlight = hero?.highlight?.trim() || "connecting you with trusted stores"
	const heroDescription = hero?.description?.trim() || "Discover stores, explore what they offer, and connect directly with independent merchants across Kenya."
	const [industrySlug, setIndustrySlug] = useState("all")
	const availableStores: HeroStore[] = stores
	const industries = Array.from(new Map(availableStores.flatMap((store) => store.industry ? [[store.industry.slug, store.industry.name] as const] : [])).entries()).sort((left, right) => left[1].localeCompare(right[1]))
	const filteredStores = industrySlug === "all" ? availableStores : availableStores.filter((store) => store.industry?.slug === industrySlug)
	const heroStores = getHeroStores(filteredStores)

	return (
		<section aria-labelledby="platform-hero-title" className="space-y-8">
			<div className="glass-card navy-glass rounded-3xl px-5 py-10 text-center shadow-xl sm:px-10 sm:py-14 lg:px-16 lg:py-16">
				<h1 id="platform-hero-title" className="mx-auto max-w-5xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-6xl">
					{heroTitle} <span className="text-primary">{heroHighlight}</span>
				</h1>
				<p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg lg:text-xl">{heroDescription}</p>
			</div>
			<TrustStrip />
			<section className="rounded-3xl border border-theme-border bg-theme-surface p-5 shadow-xl sm:p-8">
				<div className="text-center">
					<h2 className="text-2xl font-extrabold text-theme-text sm:text-3xl">Top Available Stores</h2>
					<p className="mx-auto mt-2 max-w-2xl text-sm text-theme-muted sm:text-base">Browse verified independent stores by the kind of products they offer.</p>
				</div>
				<div className="mt-5 flex justify-center">
					<label className="inline-flex items-center gap-3 rounded-2xl border border-theme-border bg-theme-bg/80 px-4 py-3 text-theme-text shadow-sm backdrop-blur-xl transition focus-within:ring-2 focus-within:ring-primary/35">
						<span className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Industry</span>
						<span className="relative">
							<select
								aria-label="Filter top available stores by industry"
								value={industrySlug}
								onChange={(event) => setIndustrySlug(event.target.value)}
								className="min-w-36 appearance-none rounded-xl border border-theme-border bg-theme-surface px-4 py-2.5 pr-10 text-sm font-semibold text-theme-text shadow-inner outline-none transition hover:border-primary focus:border-primary"
								style={{ colorScheme: isLight ? "light" : "dark" }}
							>
								<option value="all">All industries</option>
								{industries.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
							</select>
							<ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary" />
						</span>
					</label>
				</div>
				{heroStores.length ? <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">{heroStores.map((store) => <StoreCard key={store.id} store={store} />)}</div> : <p className="mt-6 rounded-xl border border-theme-border p-6 text-center text-sm text-theme-muted">No stores are available in this industry yet.</p>}
				<div className="mt-7 flex justify-center"><Link href="/stores?all=1" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Explore Stores <ArrowRight size={18} /></Link></div>
			</section>
		</section>
	)
}
