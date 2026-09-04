"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { THEME_PRESETS } from "@/config/theme-presets"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"

type Draft = {
	name?: string
	logoUrl?: string
	themePreset?: string
	seo?: { description?: string }
	homepage?: { heroTitle?: string; heroHighlight?: string; heroDescription?: string }
	contact?: { phoneDisplay?: string; email?: string; whatsappNumber?: string; whatsappFloatingMessage?: string; addressLine?: string; cityCountry?: string; businessHours?: string; responseTime?: string; social?: { facebook?: string; instagram?: string; tiktok?: string } }
	commerce?: { freeShippingThreshold?: number; defaultShippingCost?: number }
}
type Version = { version: number; publishedAt: string | null; createdAt: string }

const LOCAL_DRAFT_KEY = "novatech-store-design-draft"

function readLocalDraft(): Draft {
	try {
		const value = JSON.parse(window.localStorage.getItem(LOCAL_DRAFT_KEY) || "null")
		return value && typeof value === "object" ? value as Draft : {}
	} catch {
		return {}
	}
}

export default function StoreDesignPage() {
	const [draft, setDraft] = useState<Draft>({})
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [busy, setBusy] = useState(false)
	const [localPreview, setLocalPreview] = useState(false)
	const [versions, setVersions] = useState<Version[]>([])
	const [acceptLegalTerms, setAcceptLegalTerms] = useState(false)
	const [rollbackVersion, setRollbackVersion] = useState<number | null>(null)
	const { addToast } = useToast()

	const preset = useMemo(
		() => Object.values(THEME_PRESETS).find((item) => item.id === draft.themePreset) || Object.values(THEME_PRESETS)[0],
		[draft.themePreset],
	)

	useEffect(() => {
		const localDraft = readLocalDraft()
		fetch("/api/manage/store/settings", { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) throw new Error("Store settings unavailable")
				const data = await response.json()
				const store = data.store || {}
				setVersions(data.versions || [])
					const savedDraft = store.draftSettings || {}
					setDraft({
						name: store.name,
						logoUrl: store.logoUrl || "",
						themePreset: store.themeSettings?.preset,
						...savedDraft,
						seo: { ...store.seoSettings, ...savedDraft.seo },
						homepage: { ...store.homepageSettings, ...savedDraft.homepage },
						contact: { ...store.contactSettings, ...savedDraft.contact, social: { ...store.contactSettings?.social, ...savedDraft.contact?.social } },
						commerce: { ...store.commerceSettings, ...savedDraft.commerce },
					})
			})
			.catch(() => {
				setDraft(localDraft)
				setLocalPreview(true)
				setError("Database unavailable. You can continue in local preview mode; publication is disabled.")
			})
	}, [])

	function updateDraft(patch: Partial<Draft>) {
		setDraft((current) => ({ ...current, ...patch }))
	}

	async function rollback(version: number) {
		setBusy(true)
		setMessage("")
		setError("")
		try {
			const response = await fetch("/api/manage/store/rollback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version, acceptLegalTerms }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to roll back")
			setLocalPreview(false)
			setMessage(`Version ${version} restored as published version ${data.version}.`)
			addToast(`Version ${version} restored successfully.`, "success")
			setVersions((current) => [{ version: data.version, publishedAt: new Date().toISOString(), createdAt: new Date().toISOString() }, ...current])
		} catch (rollbackError) {
			const message = rollbackError instanceof Error ? rollbackError.message : "Rollback requires the database and store-owner access."
			setError(message); addToast(message, "error")
		}
		setBusy(false)
	}

	function saveLocalDraft() {
		try {
			window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft))
		} catch {
			// The editor remains usable if browser storage is disabled.
		}
	}

	async function save() {
		setBusy(true)
		setMessage("")
		setError("")
		saveLocalDraft()
		try {
			const response = await fetch("/api/manage/store/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to save draft")
			setDraft(data.draftSettings)
			setLocalPreview(false)
			setMessage("Draft saved to the store. It is not public until published.")
			addToast("Store draft saved successfully.", "success")
		} catch {
			setLocalPreview(true)
			setMessage("Draft saved locally for preview. Database persistence is unavailable.")
			addToast("Draft saved locally. Database persistence is unavailable.", "info")
		}
		setBusy(false)
	}

	async function publish() {
		setBusy(true)
		setMessage("")
		setError("")
		try {
			const response = await fetch("/api/manage/store/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptLegalTerms }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to publish")
			setLocalPreview(false)
			setMessage(`Published settings version ${data.version}.`)
			addToast("Store draft published successfully.", "success")
		} catch {
			const message = "Publication requires the database and authorized store membership. The local preview remains unchanged."
			setError(message); addToast(message, "error")
		}
		setBusy(false)
	}

	const heroTitle = draft.homepage?.heroTitle || "Upgrade Your Tech"
	const heroHighlight = draft.homepage?.heroHighlight || "With Genuine Deals"
	const heroDescription = draft.homepage?.heroDescription || draft.seo?.description || "A polished storefront for your latest products and offers."

	return (
		<div className="space-y-6">
			<ConfirmDialog
				open={rollbackVersion !== null}
				title="Restore this published version?"
				description={rollbackVersion === null ? "" : `Version ${rollbackVersion} will be copied into a new published version. Your current version remains recoverable.`}
				confirmLabel="Restore version"
				busy={busy}
				onCancel={() => { if (!busy) setRollbackVersion(null) }}
				onConfirm={() => {
					if (rollbackVersion === null) return
					const version = rollbackVersion
					setRollbackVersion(null)
					void rollback(version)
				}}
			/>
			<div>
				<h1 className="text-3xl font-bold">Store design</h1>
				<p className="mt-1 text-gray-500">Edit approved branding and content, preview the result, then publish a version when the store backend is available.</p>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
				<section className="glass-card space-y-5 p-6">
					{localPreview && <p className="rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Local preview mode: changes are stored only in this browser until database access is restored.</p>}
					<label className="block"><span className="text-sm font-medium">Store name</span><input value={draft.name || ""} onChange={(event) => updateDraft({ name: event.target.value })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
					<label className="block"><span className="text-sm font-medium">Store logo URL or app path</span><input type="text" value={draft.logoUrl || ""} onChange={(event) => updateDraft({ logoUrl: event.target.value })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="/images/your-logo.png or https://..." /><span className="mt-1 block text-xs text-gray-500">Use an HTTPS image URL or an app-relative path. It applies only to this storefront after publishing.</span></label>
					<div>
						<p className="text-sm font-medium">Theme preset</p>
						<div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.values(THEME_PRESETS).map((item) => <button type="button" key={item.id} onClick={() => updateDraft({ themePreset: item.id })} className={`rounded-lg border p-3 text-left ${draft.themePreset === item.id ? "border-primary ring-2 ring-primary/20" : ""}`}><span className="font-medium">{item.name}</span><span className="mt-1 block text-xs text-gray-500">{item.description}</span></button>)}</div>
					</div>
					<label className="block"><span className="text-sm font-medium">Hero title</span><input value={draft.homepage?.heroTitle || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, heroTitle: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
					<label className="block"><span className="text-sm font-medium">Hero highlight</span><input value={draft.homepage?.heroHighlight || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, heroHighlight: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
					<label className="block"><span className="text-sm font-medium">SEO description</span><textarea maxLength={320} value={draft.seo?.description || ""} onChange={(event) => updateDraft({ seo: { ...draft.seo, description: event.target.value } })} className="mt-2 min-h-24 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
					<div className="border-t pt-5">
						<h2 className="font-semibold">Store contact</h2>
						<div className="mt-3 grid gap-3 sm:grid-cols-2">
							<label className="block"><span className="text-sm font-medium">Phone</span><input value={draft.contact?.phoneDisplay || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, phoneDisplay: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="+254 700 123 456" /></label>
							<label className="block"><span className="text-sm font-medium">Email</span><input type="email" value={draft.contact?.email || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, email: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="hello@example.com" /></label>
							<label className="block"><span className="text-sm font-medium">WhatsApp number</span><input inputMode="numeric" value={draft.contact?.whatsappNumber || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, whatsappNumber: event.target.value.replace(/\D/g, "") } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="254700123456" /><span className="mt-1 block text-xs text-gray-500">Use the full country-code number, without spaces or a leading +.</span></label>
							<label className="block"><span className="text-sm font-medium">Floating WhatsApp and social-link message</span><input value={draft.contact?.whatsappFloatingMessage || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, whatsappFloatingMessage: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder={`Hello ${draft.name || "your store"}, I need help with my order.`} /><span className="mt-1 block text-xs text-gray-500">Used only by the floating WhatsApp button and WhatsApp social link. Contact-page chat and product/order links are unchanged.</span></label>
							<label className="block"><span className="text-sm font-medium">Business hours</span><input value={draft.contact?.businessHours || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, businessHours: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="Mon - Sat, 8AM - 6PM" /></label>
							<label className="block"><span className="text-sm font-medium">Address</span><input value={draft.contact?.addressLine || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, addressLine: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="Street and building" /></label>
							<label className="block"><span className="text-sm font-medium">City and country</span><input value={draft.contact?.cityCountry || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, cityCountry: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="Nairobi, Kenya" /></label>
							<label className="block sm:col-span-2"><span className="text-sm font-medium">Response time</span><input value={draft.contact?.responseTime || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, responseTime: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="We reply within 24 hours" /></label>
						</div>
						<div className="mt-5 border-t pt-5">
							<h3 className="font-semibold">Social links</h3>
							<p className="mt-1 text-sm text-gray-500">Add secure HTTPS links to your merchant profiles. Leave a field blank to hide that icon from the storefront.</p>
							<div className="mt-3 grid gap-3 sm:grid-cols-2">
								<label className="block"><span className="text-sm font-medium">Facebook URL</span><input type="url" value={draft.contact?.social?.facebook || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, social: { ...draft.contact?.social, facebook: event.target.value } } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="https://facebook.com/your-page" /></label>
								<label className="block"><span className="text-sm font-medium">Instagram URL</span><input type="url" value={draft.contact?.social?.instagram || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, social: { ...draft.contact?.social, instagram: event.target.value } } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="https://instagram.com/your-profile" /></label>
								<label className="block sm:col-span-2"><span className="text-sm font-medium">TikTok URL</span><input type="url" value={draft.contact?.social?.tiktok || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, social: { ...draft.contact?.social, tiktok: event.target.value } } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="https://tiktok.com/@your-profile" /></label>
							</div>
						</div>
					</div>
					<div className="border-t pt-5">
						<h2 className="font-semibold">Shipping defaults</h2>
						<div className="mt-3 grid gap-3 sm:grid-cols-2">
							<label className="block"><span className="text-sm font-medium">Free shipping threshold</span><input type="number" min="0" value={draft.commerce?.freeShippingThreshold ?? ""} onChange={(event) => updateDraft({ commerce: { ...draft.commerce, freeShippingThreshold: event.target.value === "" ? undefined : Number(event.target.value) } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
							<label className="block"><span className="text-sm font-medium">Default shipping cost</span><input type="number" min="0" value={draft.commerce?.defaultShippingCost ?? ""} onChange={(event) => updateDraft({ commerce: { ...draft.commerce, defaultShippingCost: event.target.value === "" ? undefined : Number(event.target.value) } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
						</div>
					</div>
					{error && <p className="text-sm text-red-600">{error}</p>}
					{message && <p className="text-sm text-green-600">{message}</p>}
					<label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={acceptLegalTerms} onChange={(event) => setAcceptLegalTerms(event.target.checked)} className="mt-1" /><span>Before publishing, I confirm that I have reviewed the current <a href="/terms" target="_blank" rel="noreferrer" className="text-primary underline">merchant terms</a> and <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-primary underline">privacy notice</a>, and understand that the merchant is responsible for its store sales, customers, delivery, refunds, taxes, and warranties.</span></label>
					<div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={save} className="btn-primary inline-flex items-center gap-2">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? "Saving…" : "Save draft"}</button><button type="button" disabled={busy || localPreview || !acceptLegalTerms} onClick={publish} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? "Publishing…" : "Publish draft"}</button></div>
					{versions.length > 0 && <div className="border-t pt-5"><h2 className="font-semibold">Published versions</h2><p className="mt-1 text-sm text-gray-500">Rolling back creates a new version, so the current version remains recoverable.</p><div className="mt-3 space-y-2">{versions.map((item) => <div className="flex items-center justify-between gap-3 rounded-lg border p-3" key={`${item.version}-${item.createdAt}`}><span className="text-sm">Version {item.version} · {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "unpublished"}</span><button type="button" disabled={busy || localPreview} onClick={() => setRollbackVersion(item.version)} className="inline-flex items-center gap-1 rounded border px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">{busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}Restore</button></div>)}</div></div>}
				</section>

				<section aria-label="Storefront preview" className="overflow-hidden rounded-2xl border shadow-xl" style={{ backgroundColor: preset.light.background, color: preset.light.text, fontFamily: preset.fontBody }}>
					<div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: preset.light.border, backgroundColor: preset.light.surface }}><span className="font-bold" style={{ fontFamily: preset.fontHeading }}>{draft.name || "Your Store"}</span><span className="text-xs" style={{ color: preset.light.muted }}>Preview only</span></div>
					<div className="p-6 sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: preset.primary }}>Featured storefront</p><h2 className="mt-3 text-3xl font-extrabold sm:text-4xl" style={{ fontFamily: preset.fontHeading }}>{heroTitle}</h2><p className="mt-1 text-2xl font-bold" style={{ color: preset.accent }}>{heroHighlight}</p><p className="mt-4 text-sm leading-6" style={{ color: preset.light.muted }}>{heroDescription}</p><button type="button" className="mt-6 rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: preset.primary }}>Shop the collection</button><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-xl border p-4" style={{ borderColor: preset.light.border, backgroundColor: preset.light.surface }}><span className="block h-12 rounded-lg" style={{ backgroundColor: preset.primary }} /><span className="mt-3 block text-sm font-semibold">Featured products</span></div><div className="rounded-xl border p-4" style={{ borderColor: preset.light.border, backgroundColor: preset.light.surface }}><span className="block h-12 rounded-lg" style={{ backgroundColor: preset.accent }} /><span className="mt-3 block text-sm font-semibold">Special offers</span></div></div><div className="mt-8 border-t pt-5" style={{ borderColor: preset.light.border }}><p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: preset.light.muted }}>Stay connected</p><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full px-3 py-1" style={{ backgroundColor: preset.light.surface }}>Facebook</span><span className="rounded-full px-3 py-1" style={{ backgroundColor: preset.light.surface }}>Instagram</span><span className="rounded-full px-3 py-1" style={{ backgroundColor: preset.light.surface }}>TikTok</span></div></div></div>
				</section>
			</div>
		</div>
	)
}
