import Link from "next/link"
import { ArrowRight, Check, Sparkles } from "lucide-react"
import type { PublicPlan, PublicPlanCatalogSource } from "@/lib/public-plans.server"

function money(value: number | null, currency: string) {
	return value == null ? "Contact us" : `${currency} ${value.toLocaleString()}`
}

function featureList(plan: PublicPlan) {
	const entitlements = plan.entitlements
	const productLimit = typeof entitlements.productLimit === "number" ? `Up to ${entitlements.productLimit.toLocaleString()} products` : null
	const staffAccounts = typeof entitlements.staffAccounts === "number" ? `${entitlements.staffAccounts} staff account${entitlements.staffAccounts === 1 ? "" : "s"}` : null
	const storageGb = typeof entitlements.storageGb === "number" ? `${entitlements.storageGb} GB storage` : null
	const analytics = entitlements.analyticsLevel === "advanced" ? "Advanced analytics" : entitlements.analyticsLevel === "basic" ? "Basic analytics" : null
	const customDomainCount = typeof entitlements.customDomainCount === "number" ? `Up to ${entitlements.customDomainCount} custom domains` : entitlements.customDomain === true ? "One custom domain" : "Nurava subdomain"

	return [productLimit, staffAccounts, storageGb, analytics, customDomainCount].filter((feature): feature is string => Boolean(feature))
}

function planDescription(key: string) {
	if (key === "STARTER") return "The essentials for launching your first online store."
	if (key === "BUSINESS") return "More capacity and advanced tools for a growing operation."
	if (key === "ENTERPRISE") return "Higher limits and multi-domain support for established teams."
	return "A flexible Nurava Tech plan for your store."
}

function PlanCard({ plan, featured }: { plan: PublicPlan; featured: boolean }) {
	const features = featureList(plan)
	return (
		<article className={`relative flex h-full flex-col rounded-3xl border p-6 shadow-lg ${featured ? "border-primary bg-primary/[0.08] shadow-primary/10" : "border-white/10 bg-white/[0.04] dark:bg-white/[0.03]"}`}>
			{featured && <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white"><Sparkles size={13} /> Most popular</div>}
			<div>
				<p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{plan.name}</p>
				<h3 className="mt-3 text-2xl font-extrabold">{money(plan.price, plan.currency)}<span className="text-sm font-medium text-gray-500 dark:text-gray-400">{plan.price != null && plan.billingInterval ? ` / ${plan.billingInterval.toLowerCase()}` : ""}</span></h3>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">One-time setup: <span className="font-semibold text-gray-700 dark:text-gray-200">{money(plan.setupFeeAmount, plan.currency)}</span></p>
				<p className="mt-4 min-h-12 text-sm leading-6 text-gray-600 dark:text-gray-300">{planDescription(plan.key)}</p>
			</div>
			<ul className="mt-5 flex-1 space-y-3 border-t border-white/10 pt-5 text-sm text-gray-700 dark:text-gray-200">
				{features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check size={17} className="mt-0.5 shrink-0 text-emerald-500" /> <span>{feature}</span></li>)}
				{plan.transactionFeePercent === 0 && <li className="flex items-start gap-2"><Check size={17} className="mt-0.5 shrink-0 text-emerald-500" /> <span>0% platform transaction fee</span></li>}
			</ul>
			<Link href={`/onboarding?plan=${encodeURIComponent(plan.key)}`} className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${featured ? "bg-primary text-white hover:brightness-110" : "border border-primary/40 text-primary hover:bg-primary/10"}`}>Choose {plan.name} <ArrowRight size={16} /></Link>
		</article>
	)
}

export default function PlatformPlans({ plans, unavailable, source }: { plans: PublicPlan[]; unavailable: boolean; source: PublicPlanCatalogSource }) {
	return (
		<section id="plans" aria-labelledby="platform-plans-title" className="scroll-mt-24 rounded-3xl border border-primary/15 bg-gradient-to-b from-primary/[0.08] to-transparent p-5 sm:p-8">
			<div className="mx-auto max-w-3xl text-center">
				<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Plans for store partners</p>
				<h2 id="platform-plans-title" className="mt-2 text-3xl font-extrabold sm:text-4xl">Simple billing, clear capacity</h2>
				<p className="mt-3 font-semibold text-primary">Every new store starts with a six-month free Founding Merchant pilot on Starter limits — no payment is required to create your store.</p>
				<p className="mt-2 text-gray-600 dark:text-gray-300">Plans are billed monthly with a one-time setup fee. When your pilot ends, you choose and pay for the plan that fits your store — nothing is charged automatically.</p>
				<p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{source === "database" ? "Prices shown from the active billing catalog." : "Prices shown from Nurava Tech's approved launch catalog; live billing is confirmed during setup."}</p>
			</div>
			{unavailable ? <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center text-sm text-amber-900">Plan pricing is temporarily unavailable while the billing catalog is being connected. Please try again shortly.</div> : plans.length === 0 ? <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center text-sm text-amber-900">No public plans are currently configured.</div> : <div className="mt-8 grid gap-5 lg:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} featured={plan.key === "BUSINESS"} />)}</div>}
			<p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">New stores begin with six months free (Founding Merchant pilot, Starter limits). Setup fees and subscription charges apply only after the pilot, when you choose a plan — no automatic charges. Optional add-ons, including WhatsApp notifications, are billed according to the active catalog.</p>
		</section>
	)
}
