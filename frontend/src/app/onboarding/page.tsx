"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type ExistingStore = { name: string; slug: string; publicationStatus: string }

export default function OnboardingPage() {
	const router = useRouter()
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [stores, setStores] = useState<ExistingStore[]>([])
	const [error, setError] = useState("")
	const [saving, setSaving] = useState(false)

	useEffect(() => { fetch("/api/onboarding/store").then((response) => response.ok ? response.json() : null).then((data) => setStores(data?.stores || [])).catch(() => undefined) }, [])

	async function submit(event: FormEvent) {
		event.preventDefault()
		setSaving(true)
		setError("")
		const response = await fetch("/api/onboarding/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug: slug || undefined }) })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) setError(data.message || "Unable to create store")
		else router.push(`/manage?store=${data.slug}`)
		setSaving(false)
	}

	return <main className="mx-auto min-h-screen max-w-xl space-y-8 px-4 py-16">
		<div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">NovaTech SaaS</p><h1 className="mt-2 text-3xl font-bold">Create your store</h1><p className="mt-2 text-gray-500">Set up the store identity first. Products, design, payments, and publishing follow in the workspace.</p></div>
		{stores.length > 0 && <div className="glass-card p-5"><p className="font-semibold">Your stores</p>{stores.map((store) => <button key={store.slug} onClick={() => router.push(`/manage?store=${store.slug}`)} className="mt-3 block text-left text-primary hover:underline">{store.name} <span className="text-sm text-gray-500">({store.publicationStatus})</span></button>)}</div>}
		<form onSubmit={submit} className="glass-card space-y-5 p-6"><label className="block"><span className="text-sm font-medium">Store name</span><input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="Acme Electronics" /></label><label className="block"><span className="text-sm font-medium">Platform slug <span className="text-gray-500">(optional)</span></span><input pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={63} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="acme-electronics" /></label>{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={saving} className="btn-primary w-full">{saving ? "Creating…" : "Create store"}</button></form>
	</main>
}
