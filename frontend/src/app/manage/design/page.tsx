"use client"

import { useEffect, useState } from "react"
import { THEME_PRESETS } from "@/config/theme-presets"

type Draft = { name?: string; themePreset?: string; seo?: { description?: string }; homepage?: { heroTitle?: string; heroHighlight?: string } }

export default function StoreDesignPage() {
	const [draft, setDraft] = useState<Draft>({})
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [busy, setBusy] = useState(false)

	useEffect(() => { fetch("/api/manage/store/settings", { cache: "no-store" }).then((response) => response.json()).then((data) => { const store = data.store || {}; setDraft(store.draftSettings || { name: store.name, themePreset: store.themeSettings?.preset, seo: store.seoSettings, homepage: store.homepageSettings }) }).catch(() => setError("Store settings unavailable")) }, [])

	async function save() {
		setBusy(true); setMessage(""); setError("")
		const response = await fetch("/api/manage/store/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) setError(data.message || "Unable to save draft")
		else { setDraft(data.draftSettings); setMessage("Draft saved. It is not public until published.") }
		setBusy(false)
	}

	async function publish() {
		setBusy(true); setMessage(""); setError("")
		const response = await fetch("/api/manage/store/publish", { method: "POST" })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) setError(data.message || "Unable to publish")
		else setMessage(`Published settings version ${data.version}.`)
		setBusy(false)
	}

	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Store design</h1><p className="mt-1 text-gray-500">Edit approved branding and content in a draft, then publish a version.</p></div><div className="glass-card space-y-5 p-6"><label className="block"><span className="text-sm font-medium">Store name</span><input value={draft.name || ""} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label><div><p className="text-sm font-medium">Theme preset</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.values(THEME_PRESETS).map((preset) => <button type="button" key={preset.id} onClick={() => setDraft({ ...draft, themePreset: preset.id })} className={`rounded-lg border p-3 text-left ${draft.themePreset === preset.id ? "border-primary ring-2 ring-primary/20" : ""}`}><span className="font-medium">{preset.name}</span><span className="mt-1 block text-xs text-gray-500">{preset.description}</span></button>)}</div></div><label className="block"><span className="text-sm font-medium">SEO description</span><textarea maxLength={320} value={draft.seo?.description || ""} onChange={(event) => setDraft({ ...draft, seo: { ...draft.seo, description: event.target.value } })} className="mt-2 min-h-24 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-600">{message}</p>}<div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={save} className="btn-primary">{busy ? "Saving…" : "Save draft"}</button><button type="button" disabled={busy} onClick={publish} className="rounded-lg border px-4 py-2 font-semibold">Publish draft</button></div></div></div>
}
