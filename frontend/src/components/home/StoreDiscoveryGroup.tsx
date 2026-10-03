"use client"

import { useState } from "react"
import type { PlatformDiscoveryStore } from "@/lib/store-directory.server"

type DiscoveryEntry = PlatformDiscoveryStore & { href: string }

const approvedImageHosts = new Set(["images.unsplash.com", "images.pexels.com", ...(process.env.NEXT_PUBLIC_R2_PUBLIC_URL ? [new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname] : [])])
function approvedImageSource(value?: string | null) {
	if (!value) return null
	if (value.startsWith("/")) return value
	try {
		const url = new URL(value)
		return url.protocol === "https:" && approvedImageHosts.has(url.hostname) ? value : null
	} catch {
		return null
	}
}

function StoreCard({ entry }: { entry: DiscoveryEntry }) {
	return <article className="glass-card navy-glass overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
		<div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/80 p-2 dark:bg-white/10">{entry.logoUrl ? <img src={entry.logoUrl} alt={`${entry.name} logo`} className="h-full w-full object-contain" /> : <img src="/images/NovaTech icon.png" alt="" className="h-full w-full object-contain" />}</div><div className="min-w-0"><h3 className="truncate text-xl font-bold">{entry.name}</h3><p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{entry.tagline}</p><div className="mt-2 flex flex-wrap gap-2">{entry.industry && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{entry.industry.name}</span>}{entry.isDemo && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">Platform demo</span>}</div></div></div>
		<div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-3 py-1 font-semibold text-yellow-700 dark:text-yellow-300">★ {entry.averageRating > 0 ? entry.averageRating.toFixed(1) : "New"}</span><span className="rounded-full bg-primary/10 px-3 py-1 text-gray-600 dark:text-gray-300">{entry.reviewCount} approved reviews</span><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-gray-600 dark:text-gray-300">{entry.productCount} products</span></div>
		{entry.products.length > 0 && <div className="mt-5 grid grid-cols-3 gap-2">{entry.products.map((product) => { const image = approvedImageSource(product.image); return <a href={`${entry.href}/products/${product.slug}`} key={product.slug} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-white/10 bg-white/40 dark:bg-white/5"><div className="flex h-24 w-full items-center justify-center bg-transparent">{image ? <img src={image} alt={product.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs text-gray-500">No image</div>}</div><p className="truncate px-2 py-2 text-xs font-semibold">{product.name}</p></a> })}</div>}
		<div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4"><span className="text-xs text-gray-500">{entry.isDemo ? "Demonstration storefront" : "Independent merchant storefront"}</span><a href={entry.href} className="inline-flex items-center gap-2 font-semibold text-primary">Visit store →</a></div>
	</article>
}

export default function StoreDiscoveryGroup({ title, description, stores, industries }: {
	title: string
	description: string
	stores: DiscoveryEntry[]
	industries: Array<{ slug: string; name: string }>
}) {
	const [industrySlug, setIndustrySlug] = useState("all")
	const filteredStores = industrySlug === "all" ? stores : stores.filter((entry) => entry.industry?.slug === industrySlug)
	if (!stores.length) return null
	return <section><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">{description}</p></div><label className="flex items-center gap-2 text-sm font-medium">Industry<select aria-label={`Filter ${title} by industry`} value={industrySlug} onChange={(event) => setIndustrySlug(event.target.value)} className="rounded-lg border border-primary/30 bg-white px-3 py-2 text-gray-900"><option value="all">All industries</option>{industries.map((industry) => <option key={industry.slug} value={industry.slug}>{industry.name}</option>)}</select></label></div>{filteredStores.length ? <div className="grid gap-6 lg:grid-cols-2">{filteredStores.map((entry) => <StoreCard key={`${title}-${entry.id}`} entry={entry} />)}</div> : <p className="rounded-xl border border-primary/20 p-5 text-sm text-gray-500">No stores in this section match the selected industry.</p>}</section>
}
