import Link from "next/link"
import { ArrowRight, BadgeCheck, ShieldCheck, Star } from "lucide-react"
import type { PlatformDiscoveryStore } from "@/lib/store-directory.server"
import PlatformHero from "@/components/home/PlatformHero"
import StoreDiscoveryGroup from "@/components/home/StoreDiscoveryGroup"
import PlatformPlans from "@/components/home/PlatformPlans"
import MerchantOnboardingGuide from "@/components/home/MerchantOnboardingGuide"
import type { PublicPlan, PublicPlanCatalogSource } from "@/lib/public-plans.server"

type DiscoveryEntry = PlatformDiscoveryStore & { href: string }

const groupCopy = {
	TOP_RATED: { title: "Top-rated stores", description: "Stores with strong approved customer ratings and a consistent social-proof signal." },
	MOST_REVIEWED: { title: "Most reviewed stores", description: "Stores with the largest body of approved shopper feedback to help you compare confidently." },
	NEW_AND_GROWING: { title: "New and growing stores", description: "Published stores with products to discover; review history is still developing." },
} as const

export default function PlatformDiscoveryHome({ stores, plans, plansUnavailable, plansSource }: { stores: DiscoveryEntry[]; plans: PublicPlan[]; plansUnavailable: boolean; plansSource: PublicPlanCatalogSource }) {
	const topRated = stores.filter((store) => store.category === "TOP_RATED")
	const mostReviewed = stores.filter((store) => store.category === "MOST_REVIEWED")
	const newAndGrowing = stores.filter((store) => store.category === "NEW_AND_GROWING")
	const nuravaTech = stores.find((store) => store.slug === "nuravatech")
	if (nuravaTech && !newAndGrowing.some((store) => store.id === nuravaTech.id)) newAndGrowing.unshift(nuravaTech)
	const industries = Array.from(new Map(stores.flatMap((store) => store.industry ? [[store.industry.slug, store.industry.name] as const] : [])).entries()).map(([slug, name]) => ({ slug, name })).sort((left, right) => left.name.localeCompare(right.name))
	return <div className="space-y-16">
		<PlatformHero stores={stores} />
		<PlatformPlans plans={plans} unavailable={plansUnavailable} source={plansSource} />
		<section className="grid gap-4 lg:grid-cols-3"><div className="glass-card p-5"><Star className="text-yellow-500" /><h2 className="mt-3 font-bold">Social proof first</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">See approved ratings and review volume before choosing where to enquire.</p></div><div className="glass-card p-5"><ShieldCheck className="text-primary" /><h2 className="mt-3 font-bold">Independent merchants</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Each store manages its own product information, availability, payment, delivery, refunds, and warranty.</p></div><div className="glass-card p-5"><BadgeCheck className="text-emerald-600" /><h2 className="mt-3 font-bold">Product previews</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Preview real catalogue images from each store before opening its storefront.</p></div></section>
		{stores.length ? <><StoreDiscoveryGroup title={groupCopy.TOP_RATED.title} description={groupCopy.TOP_RATED.description} stores={topRated} industries={industries} /><StoreDiscoveryGroup title={groupCopy.MOST_REVIEWED.title} description={groupCopy.MOST_REVIEWED.description} stores={mostReviewed} industries={industries} /><StoreDiscoveryGroup title={groupCopy.NEW_AND_GROWING.title} description={groupCopy.NEW_AND_GROWING.description} stores={newAndGrowing} industries={industries} /></> : <section className="glass-card p-8 text-center"><h2 className="text-xl font-bold">Store discovery is temporarily unavailable</h2><p className="mt-2 text-gray-600 dark:text-gray-300">Published merchant stores will appear here once the platform database is connected.</p><Link href="/stores?all=1" className="mt-5 inline-flex items-center gap-2 font-semibold text-primary">Open store directory <ArrowRight size={16} /></Link></section>}
		<MerchantOnboardingGuide plans={plans} />
	</div>
}
