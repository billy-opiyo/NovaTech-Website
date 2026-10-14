"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/Toast"

type ExistingStore = { name: string; slug: string; publicationStatus: string }
type Plan = { id: string; key: string; name: string; price: number | null; currency: string; billingInterval: "MONTH" | "YEAR" | null; setupFeeAmount: number }
type Industry = { id: string; name: string; slug: string; description: string | null; icon: string | null }

export default function OnboardingPage() {
	const router = useRouter()
	const { addToast } = useToast()
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [stores, setStores] = useState<ExistingStore[]>([])
	const [plans, setPlans] = useState<Plan[]>([])
	const [industries, setIndustries] = useState<Industry[]>([])
	const [industrySlug, setIndustrySlug] = useState("electronics")
	const [planKey, setPlanKey] = useState("STARTER")
	const [plansLoading, setPlansLoading] = useState(true)
	const [acceptLegalTerms, setAcceptLegalTerms] = useState(false)
	const [error, setError] = useState("")
	const [saving, setSaving] = useState(false)
	const availablePlans = useMemo(() => plans.filter((plan) => plan.price != null && plan.billingInterval === "MONTH"), [plans])
	const selectedPlan = availablePlans.find((plan) => plan.key === planKey) || availablePlans[0]

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		const requestedName = params.get("name")
		const requestedSlug = params.get("slug")
		const requestedPlan = params.get("plan")
		if (requestedName) setName(requestedName)
		if (requestedSlug) setSlug(requestedSlug)
		const requestedIndustry = params.get("industry")
		if (requestedIndustry) setIndustrySlug(requestedIndustry)
		if (requestedPlan) setPlanKey(requestedPlan)
		fetch("/api/onboarding/store").then((response) => response.ok ? response.json() : null).then((data) => setStores(data?.stores || [])).catch(() => undefined)
		fetch("/api/billing/plans", { cache: "no-store" }).then(async (response) => {
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Plan options are unavailable")
			setPlans(Array.isArray(data.plans) ? data.plans : [])
		}).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Plan options are unavailable")).finally(() => setPlansLoading(false))
		fetch("/api/industries", { cache: "no-store" }).then(async (response) => {
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Industries are unavailable")
			const options = Array.isArray(data.industries) ? data.industries as Industry[] : []
			setIndustries(options)
			if (options.length && !options.some((industry) => industry.slug === "electronics")) setIndustrySlug(options[0].slug)
		}).catch(() => setIndustries([{ id: "electronics-fallback", name: "Electronics", slug: "electronics", description: "Phones, computers, and technology products.", icon: "cpu" }]))
	}, [])

	async function submit(event: FormEvent) {
		event.preventDefault()
		if (!selectedPlan) { setError("Choose an available monthly plan before creating the store."); return }
		setSaving(true)
		setError("")
		const response = await fetch("/api/onboarding/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug: slug || undefined, industrySlug, planKey: selectedPlan.key, acceptLegalTerms }) })
		const data = await response.json().catch(() => ({}))
		if (response.status === 401) {
			const resume = new URLSearchParams()
			if (name) resume.set("name", name)
			if (slug) resume.set("slug", slug)
			resume.set("industry", industrySlug)
			if (selectedPlan) resume.set("plan", selectedPlan.key)
			router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/onboarding?${resume.toString()}`)}`)
			setSaving(false)
			return
		}
		if (!response.ok) { setError(data.message || "Unable to create store"); addToast(data.message || "Unable to create store", "error") }
		else {
			addToast(data.setupFeeRequired ? "Store created. Pay the one-time setup fee to start your six-month pilot." : "Store created and its pilot has started.", "success")
			const storeQuery = `store=${encodeURIComponent(data.slug)}`
			router.push(data.setupFeeRequired ? `/manage/billing?${storeQuery}&setup=required` : `/manage?${storeQuery}`)
		}
		setSaving(false)
	}

	return <main className="mx-auto min-h-screen max-w-2xl space-y-8 px-4 py-16">
		<div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Nurava Tech SaaS</p><h1 className="mt-2 text-3xl font-bold">Create your store</h1><p className="mt-2 text-gray-500">Choose a monthly plan, create your workspace, then pay its one-time setup fee. Your six-month pilot begins after payment is confirmed.</p></div>
		<div className="rounded-xl border border-primary/40 bg-primary/5 p-5"><p className="font-semibold">One-time setup fee, then six months to grow</p><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">The setup fee is paid once when you create your store. It starts a six-month pilot on the plan you choose. From month seven, you can manually renew that plan by M-Pesa; Nurava Tech does not automatically charge your account.</p></div>
		{stores.length > 0 && <div className="glass-card p-5"><p className="font-semibold">Your stores</p>{stores.map((store) => <button key={store.slug} onClick={() => router.push(`/manage?store=${store.slug}`)} className="mt-3 block text-left text-primary hover:underline">{store.name} <span className="text-sm text-gray-500">({store.publicationStatus})</span></button>)}</div>}
		<form onSubmit={submit} className="glass-card space-y-5 p-6">
			<fieldset disabled={!industries.length}>
				<legend className="font-semibold">Choose your industry</legend>
				<p className="mt-1 text-sm text-gray-500">We’ll prepare relevant categories, product fields, theme, and homepage content for your store.</p>
				<div className="mt-3 grid gap-3 sm:grid-cols-3">{industries.map((industry) => <label key={industry.id} className={`cursor-pointer rounded-xl border p-4 transition ${industrySlug === industry.slug ? "border-primary bg-primary/10" : "border-gray-200 hover:border-primary/50"}`}><span className="flex items-start gap-3"><input type="radio" name="industry" value={industry.slug} checked={industrySlug === industry.slug} onChange={() => setIndustrySlug(industry.slug)} className="mt-1 accent-primary"/><span><span className="block font-semibold">{industry.name}</span><span className="mt-1 block text-xs text-gray-500">{industry.description}</span></span></span></label>)}</div>
			</fieldset>
			<fieldset disabled={plansLoading || !availablePlans.length}>
				<legend className="font-semibold">Choose your monthly plan</legend>
				<p className="mt-1 text-sm text-gray-500">This is the plan and product capacity your store uses during the pilot and after it.</p>
				{plansLoading ? <p className="mt-3 text-sm text-gray-500">Loading plans…</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2">{availablePlans.map((plan) => <label key={plan.key} className={`cursor-pointer rounded-xl border p-4 transition ${selectedPlan?.key === plan.key ? "border-primary bg-primary/10" : "border-gray-200 hover:border-primary/50"}`}><span className="flex items-start gap-3"><input type="radio" name="plan" value={plan.key} checked={selectedPlan?.key === plan.key} onChange={() => setPlanKey(plan.key)} className="mt-1 accent-primary"/><span><span className="block font-semibold">{plan.name}</span><span className="mt-1 block text-sm">{plan.currency} {plan.price?.toLocaleString()} / month from month seven</span><span className="mt-1 block text-xs text-gray-500">One-time setup: {plan.currency} {plan.setupFeeAmount.toLocaleString()}</span></span></span></label>)}</div>}
			</fieldset>
			<label className="block"><span className="text-sm font-medium">Store name</span><input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="Acme Electronics" /></label>
			<label className="block"><span className="text-sm font-medium">Platform slug <span className="text-gray-500">(optional)</span></span><input pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={63} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="acme-electronics" /></label>
			<label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={acceptLegalTerms} onChange={(event) => setAcceptLegalTerms(event.target.checked)} className="mt-1" /><span>I confirm that I have reviewed the current <a href="/terms" target="_blank" rel="noreferrer" className="text-primary underline">merchant terms</a> and <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-primary underline">privacy notice</a>, and understand that the merchant is responsible for its store sales, customers, delivery, refunds, taxes, and warranties.</span></label>
			{error && <p className="text-sm text-red-600">{error}</p>}
			<button disabled={saving || plansLoading || !selectedPlan} className="btn-primary w-full">{saving ? "Creating…" : selectedPlan ? `Create store · ${selectedPlan.currency} ${selectedPlan.setupFeeAmount.toLocaleString()} setup` : "No monthly plans available"}</button>
		</form>
	</main>
}
