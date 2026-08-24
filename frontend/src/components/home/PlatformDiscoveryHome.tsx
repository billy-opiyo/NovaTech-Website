import Link from "next/link"
import { ArrowRight, BadgeCheck, MessageCircle, ShieldCheck, Star } from "lucide-react"
import type { PlatformDiscoveryStore } from "@/lib/store-directory.server"
import PlatformHero from "@/components/home/PlatformHero"
import PlatformPlans from "@/components/home/PlatformPlans"
import type { PublicPlan, PublicPlanCatalogSource } from "@/lib/public-plans.server"

type DiscoveryEntry = PlatformDiscoveryStore & { href: string }

const groupCopy = {
	TOP_RATED: { title: "Top-rated stores", description: "Stores with strong approved customer ratings and a consistent social-proof signal." },
	MOST_REVIEWED: { title: "Most reviewed stores", description: "Stores with the largest body of approved shopper feedback to help you compare confidently." },
	NEW_AND_GROWING: { title: "New and growing stores", description: "Published stores with products to discover; review history is still developing." },
} as const

function StoreCard({ entry }: { entry: DiscoveryEntry }) {
	return <article className="glass-card navy-glass overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
		<div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/80 p-2 dark:bg-white/10"><img src={entry.logoUrl || "/images/NovaTech icon.png"} alt="" className="h-full w-full object-contain" /></div><div className="min-w-0"><h3 className="truncate text-xl font-bold">{entry.name}</h3><p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{entry.tagline}</p></div></div>
		<div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-3 py-1 font-semibold text-yellow-700 dark:text-yellow-300"><Star size={15} className="fill-current" /> {entry.averageRating > 0 ? entry.averageRating.toFixed(1) : "New"}</span><span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-gray-600 dark:text-gray-300"><MessageCircle size={15} /> {entry.reviewCount} approved reviews</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-gray-600 dark:text-gray-300"><BadgeCheck size={15} /> {entry.productCount} products</span></div>
		{entry.products.length > 0 && <div className="mt-5 grid grid-cols-3 gap-2">{entry.products.map((product) => <Link href={`${entry.href}/products/${product.slug}`} key={product.slug} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-white/10 bg-white/40 dark:bg-white/5"><div className="relative h-24 w-full bg-gray-100 dark:bg-gray-900">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs text-gray-500">No image</div>}</div><p className="truncate px-2 py-2 text-xs font-semibold">{product.name}</p></Link>)}</div>}
		<div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4"><span className="text-xs text-gray-500">{entry.category === "TOP_RATED" ? "Based on approved ratings" : entry.category === "MOST_REVIEWED" ? "Based on approved review volume" : "Review history developing"}</span><a href={entry.href} className="inline-flex items-center gap-2 font-semibold text-primary">Visit store <ArrowRight size={16} /></a></div>
	</article>
}

function StoreGroup({ category, stores }: { category: keyof typeof groupCopy; stores: DiscoveryEntry[] }) {
	if (!stores.length) return null
	return <section><div className="mb-6"><h2 className="text-2xl font-bold sm:text-3xl">{groupCopy[category].title}</h2><p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">{groupCopy[category].description}</p></div><div className="grid gap-6 lg:grid-cols-2">{stores.map((entry) => <StoreCard key={`${category}-${entry.id}`} entry={entry} />)}</div></section>
}

export default function PlatformDiscoveryHome({ stores, plans, plansUnavailable, plansSource }: { stores: DiscoveryEntry[]; plans: PublicPlan[]; plansUnavailable: boolean; plansSource: PublicPlanCatalogSource }) {
	const topRated = stores.filter((store) => store.category === "TOP_RATED")
	const mostReviewed = stores.filter((store) => store.category === "MOST_REVIEWED")
	const newAndGrowing = stores.filter((store) => store.category === "NEW_AND_GROWING")
	return <div className="space-y-16">
		<PlatformHero stores={stores} />
		<PlatformPlans plans={plans} unavailable={plansUnavailable} source={plansSource} />
		<section className="grid gap-4 md:grid-cols-3"><div className="glass-card p-5"><Star className="text-yellow-500" /><h2 className="mt-3 font-bold">Social proof first</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">See approved ratings and review volume before choosing where to enquire.</p></div><div className="glass-card p-5"><ShieldCheck className="text-primary" /><h2 className="mt-3 font-bold">Independent merchants</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Each store manages its own product information, availability, payment, delivery, refunds, and warranty.</p></div><div className="glass-card p-5"><BadgeCheck className="text-emerald-600" /><h2 className="mt-3 font-bold">Product previews</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Preview real catalogue images from each store before opening its storefront.</p></div></section>
		{stores.length ? <><StoreGroup category="TOP_RATED" stores={topRated} /><StoreGroup category="MOST_REVIEWED" stores={mostReviewed} /><StoreGroup category="NEW_AND_GROWING" stores={newAndGrowing} /></> : <section className="glass-card p-8 text-center"><h2 className="text-xl font-bold">Store discovery is temporarily unavailable</h2><p className="mt-2 text-gray-600 dark:text-gray-300">Published merchant stores will appear here once the platform database is connected.</p><Link href="/stores?all=1" className="mt-5 inline-flex items-center gap-2 font-semibold text-primary">Open store directory <ArrowRight size={16} /></Link></section>}
	</div>
}
