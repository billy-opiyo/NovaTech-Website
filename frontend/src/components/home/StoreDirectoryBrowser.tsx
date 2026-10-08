"use client"

import { useMemo, useState } from "react"
import { ArrowRight, ChevronDown, SlidersHorizontal, Store as StoreIcon } from "lucide-react"
import type { PublishedStoreDirectoryEntry } from "@/lib/store-directory.server"

type DirectoryStore = PublishedStoreDirectoryEntry & { href: string }

const UNCLASSIFIED_INDUSTRY = "__unclassified__"

export default function StoreDirectoryBrowser({ stores }: { stores: DirectoryStore[] }) {
	const [industrySlug, setIndustrySlug] = useState("all")
	const industries = useMemo(() => {
		const available = new Map<string, string>()
		for (const store of stores) {
			if (store.industry) available.set(store.industry.slug, store.industry.name)
		}
		return Array.from(available, ([slug, name]) => ({ slug, name })).sort((left, right) => left.name.localeCompare(right.name))
	}, [stores])
	const filteredStores = industrySlug === "all"
		? stores
		: industrySlug === UNCLASSIFIED_INDUSTRY
			? stores.filter((store) => !store.industry)
			: stores.filter((store) => store.industry?.slug === industrySlug)
	const hasUnclassifiedStores = stores.some((store) => !store.industry)

	return (
		<div className="space-y-5">
			<div className="glass-card navy-glass flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
				<div className="flex items-start gap-3">
					<span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<SlidersHorizontal size={19} aria-hidden="true" />
					</span>
					<div>
						<p className="font-semibold">Browse by industry</p>
						<p className="mt-1 text-sm text-gray-600 dark:text-gray-300" aria-live="polite">
							Showing {filteredStores.length} {filteredStores.length === 1 ? "store" : "stores"}
						</p>
					</div>
				</div>
				<label className="relative block w-full sm:w-64">
					<span className="sr-only">Filter stores by industry</span>
					<select
						aria-label="Filter stores by industry"
						value={industrySlug}
						onChange={(event) => setIndustrySlug(event.target.value)}
						className="w-full cursor-pointer appearance-none rounded-xl border border-primary/30 bg-theme-surface px-4 py-3 pr-11 font-semibold text-theme-text shadow-sm outline-none transition hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/30"
					>
						<option value="all">All industries</option>
						{industries.map((industry) => <option key={industry.slug} value={industry.slug}>{industry.name}</option>)}
						{hasUnclassifiedStores && <option value={UNCLASSIFIED_INDUSTRY}>Other industries</option>}
					</select>
					<ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary" size={18} aria-hidden="true" />
				</label>
			</div>

			{filteredStores.length ? (
				<section className="grid gap-6 lg:grid-cols-2" aria-label="Stores">
					{filteredStores.map((store) => (
						<a key={store.id} href={store.href} className="glass-card navy-glass group block p-6 transition hover:-translate-y-1 hover:shadow-xl">
							<div className="flex items-start justify-between gap-4">
								<div className="flex min-w-0 items-center gap-4">
									<div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/70 p-2 dark:bg-white/10">
										{store.logoUrl ? <img src={store.logoUrl} alt={`${store.name} logo`} className="h-full w-full object-contain" /> : <StoreIcon className="text-primary" size={28} aria-hidden="true" />}
									</div>
									<div className="min-w-0">
										<h2 className="truncate text-xl font-bold group-hover:text-primary">{store.name}</h2>
										<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{store.tagline}</p>
										{store.industry && <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{store.industry.name}</span>}
									</div>
								</div>
								<ArrowRight className="mt-1 shrink-0 text-primary transition group-hover:translate-x-1" size={20} aria-hidden="true" />
							</div>
							{store.featuredProduct && (
								<p className="mt-6 border-t border-white/10 pt-4 text-sm text-gray-600 dark:text-gray-300">
									Featured: <span className="font-semibold text-theme-text">{store.featuredProduct.name}</span>
								</p>
							)}
							<span className="mt-5 inline-flex items-center gap-2 font-semibold text-primary">Visit store <ArrowRight size={16} aria-hidden="true" /></span>
						</a>
					))}
				</section>
			) : (
				<div className="glass-card navy-glass p-8 text-center">
					<h2 className="text-xl font-bold">No stores in this industry yet</h2>
					<p className="mt-2 text-gray-600 dark:text-gray-300">Choose another industry to explore its published stores.</p>
				</div>
			)}
		</div>
	)
}
