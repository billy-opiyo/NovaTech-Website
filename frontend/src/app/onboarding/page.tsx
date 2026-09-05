"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/Toast"

type ExistingStore = { name: string; slug: string; publicationStatus: string }

export default function OnboardingPage() {
	const router = useRouter()
	const { addToast } = useToast()
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [stores, setStores] = useState<ExistingStore[]>([])
	// Approved MVP policy: every new store starts on the Starter plan as part of
	// the six-month free Founding Merchant pilot. Plan selection and payment
	// happen later, from the billing page, when the merchant chooses.
	const planKey = "STARTER"
	const [acceptLegalTerms, setAcceptLegalTerms] = useState(false)
	const [error, setError] = useState("")
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		const requestedName = params.get("name")
		const requestedSlug = params.get("slug")
		if (requestedName) setName(requestedName)
		if (requestedSlug) setSlug(requestedSlug)
		fetch("/api/onboarding/store").then((response) => response.ok ? response.json() : null).then((data) => setStores(data?.stores || [])).catch(() => undefined)
	}, [])

	async function submit(event: FormEvent) {
		event.preventDefault()
		setSaving(true)
		setError("")
		const response = await fetch("/api/onboarding/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug: slug || undefined, planKey, acceptLegalTerms }) })
		const data = await response.json().catch(() => ({}))
		if (response.status === 401) {
			const resume = new URLSearchParams()
			if (name) resume.set("name", name)
			if (slug) resume.set("slug", slug)
			router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/onboarding?${resume.toString()}`)}`)
			setSaving(false)
			return
		}
		if (!response.ok) { setError(data.message || "Unable to create store"); addToast(data.message || "Unable to create store", "error") }
		else { addToast("Store created successfully", "success"); router.push(`/manage?store=${data.slug}`) }
		setSaving(false)
	}

	return <main className="mx-auto min-h-screen max-w-xl space-y-8 px-4 py-16">
		<div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Nurava Tech SaaS</p><h1 className="mt-2 text-3xl font-bold">Create your store</h1><p className="mt-2 text-gray-500">Set up the store identity first. Products, design, payments, and publishing follow in the workspace.</p></div>
		<div className="border border-primary/40 bg-primary/5 p-5"><p className="font-semibold">Six months free — Founding Merchant pilot</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Your store starts on the Starter plan with nothing to pay today. After six months you decide whether to continue with a paid plan — nothing is charged automatically, and your store stays available during a 14-day grace period while you choose.</p></div>
		{stores.length > 0 && <div className="glass-card p-5"><p className="font-semibold">Your stores</p>{stores.map((store) => <button key={store.slug} onClick={() => router.push(`/manage?store=${store.slug}`)} className="mt-3 block text-left text-primary hover:underline">{store.name} <span className="text-sm text-gray-500">({store.publicationStatus})</span></button>)}</div>}
		<form onSubmit={submit} className="glass-card space-y-5 p-6"><label className="block"><span className="text-sm font-medium">Store name</span><input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="Acme Electronics" /></label><label className="block"><span className="text-sm font-medium">Platform slug <span className="text-gray-500">(optional)</span></span><input pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={63} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="acme-electronics" /></label><label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={acceptLegalTerms} onChange={(event) => setAcceptLegalTerms(event.target.checked)} className="mt-1" /><span>I confirm that I have reviewed the current <a href="/terms" target="_blank" rel="noreferrer" className="text-primary underline">merchant terms</a> and <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-primary underline">privacy notice</a>, and understand that the merchant is responsible for its store sales, customers, delivery, refunds, taxes, and warranties.</span></label>{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={saving} className="btn-primary w-full">{saving ? "Creating…" : "Create store"}</button></form>
	</main>
}
