"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { THEME_PRESETS } from "@/config/theme-presets"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import { optimizeImageForUpload } from "@/lib/image-upload"
import { notifyStoreSettingsPublished } from "@/lib/store-context"
import { useStoreContext } from "@/lib/store-context"

type Draft = {
	name?: string
	logoUrl?: string
	themePreset?: string
	seo?: { description?: string }
	homepage?: { heroTitle?: string; heroHighlight?: string; heroDescription?: string; heroImage?: string; heroImageAlt?: string; heroPrimaryLabel?: string; heroSecondaryLabel?: string; featuredTitle?: string; bannerTitle?: string; bannerContent?: string; aboutTitle?: string; aboutDescription?: string; categoryImages?: Record<string, string>; legal?: { terms?: string; privacy?: string; cookies?: string } }
	contact?: { phoneDisplay?: string; email?: string; whatsappNumber?: string; whatsappFloatingMessage?: string; addressLine?: string; cityCountry?: string; mapLink?: string; mapEmbedUrl?: string; businessHours?: string; responseTime?: string; social?: { facebook?: string; instagram?: string; tiktok?: string } }
	commerce?: { freeShippingThreshold?: number; defaultShippingCost?: number; categoryAvailability?: Record<string, boolean> }
}
type Version = { version: number; publishedAt: string | null; createdAt: string }
type BusyAction = "saving" | "publishing" | "rollback" | null

type CategorySlot = string

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
	const store = useStoreContext()
	const categorySlots = store.homepage.categories.map(({ slug, name }) => ({ slug, label: name }))
	const [draft, setDraft] = useState<Draft>({})
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [busy, setBusy] = useState<BusyAction>(null)
	const [uploadingLogo, setUploadingLogo] = useState(false)
	const [uploadingCategory, setUploadingCategory] = useState<CategorySlot | null>(null)
	const [localPreview, setLocalPreview] = useState(false)
	const [versions, setVersions] = useState<Version[]>([])
	const [acceptLegalTerms, setAcceptLegalTerms] = useState(false)
	const [rollbackVersion, setRollbackVersion] = useState<number | null>(null)
	const { addToast } = useToast()

	const preset = useMemo(
		() => Object.values(THEME_PRESETS).find((item) => item.id === draft.themePreset) || Object.values(THEME_PRESETS)[0],
		[draft.themePreset],
	)
	const industryPalette = draft.themePreset === store.themePreset ? store.themeOverrides?.colors : undefined
	const previewPrimary = industryPalette?.primary || preset.primary
	const previewAccent = industryPalette?.accent || preset.accent
	const previewBackground = industryPalette?.light?.background || preset.light.background
	const previewSurface = industryPalette?.light?.surface || preset.light.surface
	const previewText = industryPalette?.light?.text || preset.light.text
	const previewMuted = industryPalette?.light?.muted || preset.light.muted
	const previewBorder = industryPalette?.light?.border || preset.light.border
	const previewHeroImage = draft.homepage?.heroImage || store.homepage.heroImage

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
						 homepage: {
							...store.homepageSettings,
							...savedDraft.homepage,
							categoryImages: { ...store.homepageSettings?.categoryImages, ...savedDraft.homepage?.categoryImages },
							legal: { ...store.homepageSettings?.legal, ...savedDraft.homepage?.legal },
						},
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
		setBusy("rollback")
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
		setBusy(null)
	}

	function saveLocalDraft() {
		try {
			window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft))
		} catch {
			// The editor remains usable if browser storage is disabled.
		}
	}

	async function uploadLogo(file: File | undefined) {
		if (!file) return
		setUploadingLogo(true)
		setMessage("")
		setError("")
		try {
			const optimized = await optimizeImageForUpload(file)
			const body = new FormData()
			body.set("file", optimized)
			const response = await fetch("/api/manage/store/logo", { method: "POST", body })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to upload store logo")
			setDraft((current) => ({ ...current, logoUrl: data.url }))
			setMessage("Store logo uploaded. Save the draft, then publish it to make it live.")
			addToast("Store logo uploaded successfully.", "success")
		} catch (reason) {
			const text = reason instanceof Error ? reason.message : "Unable to upload store logo"
			setError(text)
			addToast(text, "error")
		} finally {
			setUploadingLogo(false)
		}
	}

	async function uploadCategoryImage(slot: CategorySlot, file: File | undefined) {
		if (!file) return
		const label = categorySlots.find((item) => item.slug === slot)?.label || slot
		setUploadingCategory(slot)
		setMessage("")
		setError("")
		try {
			const optimized = await optimizeImageForUpload(file)
			const body = new FormData()
			body.set("file", optimized)
			body.set("slot", slot)
			const response = await fetch("/api/manage/store/category-image", { method: "POST", body })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || `Unable to upload the ${label.toLowerCase()} image`)
			setDraft((current) => ({
				...current,
				homepage: {
					...current.homepage,
					categoryImages: { ...current.homepage?.categoryImages, [slot]: data.url },
				},
			}))
			setMessage(`${label} image uploaded. Save the draft, then publish it to make it live.`)
			addToast(`${label} category image uploaded successfully.`, "success")
		} catch (reason) {
			const text = reason instanceof Error ? reason.message : `Unable to upload the ${label.toLowerCase()} image`
			setError(text)
			addToast(text, "error")
		} finally {
			setUploadingCategory(null)
		}
	}

	async function save() {
		setBusy("saving")
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
		setBusy(null)
	}

	async function publish() {
		setBusy("publishing")
		setMessage("")
		setError("")
		try {
			const response = await fetch("/api/manage/store/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptLegalTerms }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to publish")
			setLocalPreview(false)
			setMessage(`Published settings version ${data.version}.`)
			addToast("Store draft published successfully.", "success")
			notifyStoreSettingsPublished({ scope: "store", storeSlug: data.store?.slug, publishedAt: data.store?.publishedAt })
		} catch {
			const message = "Publication requires the database and authorized store membership. The local preview remains unchanged."
			setError(message); addToast(message, "error")
		}
		setBusy(null)
	}

	const heroTitle = draft.homepage?.heroTitle || store.homepage.heroTitle
	const heroHighlight = draft.homepage?.heroHighlight || store.homepage.heroHighlight
	const heroDescription = draft.homepage?.heroDescription || draft.seo?.description || store.homepage.heroDescription

	return (
		<div className="space-y-6">
			<ConfirmDialog
				open={rollbackVersion !== null}
				title="Restore this published version?"
				description={rollbackVersion === null ? "" : `Version ${rollbackVersion} will be copied into a new published version. Your current version remains recoverable.`}
				confirmLabel="Restore version"
				busy={busy === "rollback"}
				onCancel={() => { if (busy === null) setRollbackVersion(null) }}
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
					<div className="block"><span className="text-sm font-medium">Store logo</span><div className="mt-2 flex flex-wrap items-center gap-3"><label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${uploadingLogo ? "cursor-wait opacity-60" : ""}`}>{uploadingLogo ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}{uploadingLogo ? "Uploading…" : "Upload logo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingLogo} onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.target.value = "" }} className="sr-only" /></label>{draft.logoUrl && <img src={draft.logoUrl} alt="Current store logo" className="h-12 w-12 rounded-lg border object-contain" />}</div><span className="mt-1 block text-xs text-gray-500">Upload a JPG, PNG, WEBP, or GIF up to 1MB. Save the draft, then publish it to make the logo live on this storefront.</span></div>
					<div>
						<p className="text-sm font-medium">Theme preset</p>
						<div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.values(THEME_PRESETS).map((item) => <button type="button" key={item.id} onClick={() => updateDraft({ themePreset: item.id })} className={`rounded-lg border p-3 text-left ${draft.themePreset === item.id ? "border-primary ring-2 ring-primary/20" : ""}`}><span className="font-medium">{item.name}</span><span className="mt-1 block text-xs text-gray-500">{item.description}</span></button>)}</div>
					</div>
					<label className="block"><span className="text-sm font-medium">Hero title</span><input value={draft.homepage?.heroTitle || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, heroTitle: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
					<label className="block"><span className="text-sm font-medium">Hero highlight</span><input value={draft.homepage?.heroHighlight || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, heroHighlight: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
					<label className="block"><span className="text-sm font-medium">Hero description</span><textarea value={draft.homepage?.heroDescription || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, heroDescription: event.target.value } })} className="mt-2 min-h-20 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
					<label className="block"><span className="text-sm font-medium">Hero image URL</span><input type="url" value={draft.homepage?.heroImage || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, heroImage: event.target.value } })} placeholder="https://images.unsplash.com/..." className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface"/><span className="mt-1 block text-xs text-gray-500">Choose an image that reflects what this store sells. Leave blank to use the industry’s default artwork.</span></label>
					<div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-sm font-medium">Hero primary button</span><input value={draft.homepage?.heroPrimaryLabel || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, heroPrimaryLabel: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label><label className="block"><span className="text-sm font-medium">Hero secondary button</span><input value={draft.homepage?.heroSecondaryLabel || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, heroSecondaryLabel: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label></div>
					<label className="block"><span className="text-sm font-medium">Featured section title</span><input value={draft.homepage?.featuredTitle || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, featuredTitle: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
					<div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-sm font-medium">Promotional banner title</span><input value={draft.homepage?.bannerTitle || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, bannerTitle: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label><label className="block"><span className="text-sm font-medium">Promotional banner content</span><textarea value={draft.homepage?.bannerContent || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, bannerContent: event.target.value } })} className="mt-2 min-h-20 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label></div>
					<label className="block"><span className="text-sm font-medium">About page title</span><input value={draft.homepage?.aboutTitle || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, aboutTitle: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="About our store" /></label>
					<label className="block"><span className="text-sm font-medium">About page description</span><textarea rows={4} value={draft.homepage?.aboutDescription || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, aboutDescription: event.target.value } })} className="mt-2 min-h-24 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="Tell shoppers what makes your store trusted." /></label>
					<div className="border-t pt-5">
						<h2 className="font-semibold">Shop by Category images</h2>
						<p className="mt-1 text-sm text-gray-500">Choose the images shown for your configured categories. The current images remain as fallbacks until you upload a replacement.</p>
						<div className="mt-4 grid gap-4 sm:grid-cols-2">
							{categorySlots.map(({ slug, label }) => {
								const fallback = store.homepage.categories.find((category) => category.slug === slug)?.image || ""
								const image = draft.homepage?.categoryImages?.[slug] || fallback
								const isUploading = uploadingCategory === slug
								return (
									<div key={slug} className="rounded-xl border p-3">
										<p className="text-sm font-medium">{label}</p>
										{image && <img src={image} alt={`${label} category preview`} className="mt-3 aspect-[16/9] w-full rounded-lg border object-cover" />}
										<label className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isUploading ? "cursor-wait opacity-60" : ""}`}>
											{isUploading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
											{isUploading ? "Uploading…" : `Upload ${label.toLowerCase()} image`}
											<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingCategory !== null} onChange={(event) => { void uploadCategoryImage(slug, event.target.files?.[0]); event.target.value = "" }} className="sr-only" />
										</label>
										<span className="mt-1 block text-xs text-gray-500">JPG, PNG, WEBP, or GIF up to 1MB.</span>
									</div>
								)
							})}
						</div>
					</div>
					<div className="border-t pt-5">
						<h2 className="font-semibold">Available product categories</h2>
						<p className="mt-1 text-sm text-gray-500">Turn off categories your store does not currently sell. Disabled categories disappear from the storefront homepage; existing products remain safely stored.</p>
						<div className="mt-3 grid gap-3 sm:grid-cols-2">{categorySlots.map(({ slug, label }) => <label key={slug} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={draft.commerce?.categoryAvailability?.[slug] !== false} onChange={(event) => updateDraft({ commerce: { ...draft.commerce, categoryAvailability: { ...draft.commerce?.categoryAvailability, [slug]: event.target.checked } } })} /><span>{label}</span></label>)}</div>
					</div>
					<div className="border-t pt-5">
						<h2 className="font-semibold">Customer-facing legal pages</h2>
						<p className="mt-1 text-sm text-gray-500">These templates belong to this merchant store only. Edit them when your own delivery, returns, privacy, or cookie practices differ.</p>
						<div className="mt-3 space-y-3">
							<label className="block"><span className="text-sm font-medium">Store Terms</span><textarea rows={6} value={draft.homepage?.legal?.terms || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, legal: { ...draft.homepage?.legal, terms: event.target.value } } })} className="mt-2 min-h-24 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
							<label className="block"><span className="text-sm font-medium">Store Privacy Policy</span><textarea rows={6} value={draft.homepage?.legal?.privacy || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, legal: { ...draft.homepage?.legal, privacy: event.target.value } } })} className="mt-2 min-h-24 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
							<label className="block"><span className="text-sm font-medium">Store Cookie Policy</span><textarea rows={6} value={draft.homepage?.legal?.cookies || ""} onChange={(event) => updateDraft({ homepage: { ...draft.homepage, legal: { ...draft.homepage?.legal, cookies: event.target.value } } })} className="mt-2 min-h-24 w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
						</div>
					</div>
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
							<label className="block"><span className="text-sm font-medium">Google Maps link URL</span><input type="url" value={draft.contact?.mapLink || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, mapLink: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="https://www.google.com/maps/..." /><span className="mt-1 block text-xs text-gray-500">Used by the Open in Google Maps link.</span></label>
							<label className="block"><span className="text-sm font-medium">Google Maps embed URL</span><input type="url" value={draft.contact?.mapEmbedUrl || ""} onChange={(event) => updateDraft({ contact: { ...draft.contact, mapEmbedUrl: event.target.value } })} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="https://www.google.com/maps/embed?..." /><span className="mt-1 block text-xs text-gray-500">Used to display the map inside the Visit Us section.</span></label>
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
					<div className="flex flex-wrap gap-3"><button type="button" disabled={busy !== null} onClick={save} className="btn-primary inline-flex items-center gap-2">{busy === "saving" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy === "saving" ? "Saving…" : "Save draft"}</button><button type="button" disabled={busy !== null || localPreview || !acceptLegalTerms} onClick={publish} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50">{busy === "publishing" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy === "publishing" ? "Publishing…" : "Publish draft"}</button></div>
					{versions.length > 0 && <div className="border-t pt-5"><h2 className="font-semibold">Published versions</h2><p className="mt-1 text-sm text-gray-500">Rolling back creates a new version, so the current version remains recoverable.</p><div className="mt-3 space-y-2">{versions.map((item) => <div className="flex items-center justify-between gap-3 rounded-lg border p-3" key={`${item.version}-${item.createdAt}`}><span className="text-sm">Version {item.version} · {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "unpublished"}</span><button type="button" disabled={busy !== null || localPreview} onClick={() => setRollbackVersion(item.version)} className="inline-flex items-center gap-1 rounded border px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">{busy === "rollback" && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}Restore</button></div>)}</div></div>}
				</section>

				<section aria-label="Storefront preview" className="overflow-hidden rounded-2xl border shadow-xl" style={{ backgroundColor: previewBackground, color: previewText, fontFamily: preset.fontBody }}>
					<div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: previewBorder, backgroundColor: previewSurface }}><span className="font-bold" style={{ fontFamily: preset.fontHeading }}>{draft.name || "Your Store"}</span><span className="text-xs" style={{ color: previewMuted }}>Preview only</span></div>
					<div className="relative isolate overflow-hidden">
						{previewHeroImage && <><img src={previewHeroImage} alt={draft.homepage?.heroImageAlt || store.homepage.heroImageAlt || ""} className="absolute inset-0 z-0 h-full w-full object-cover"/><div className="absolute inset-0 z-0 bg-black/55" aria-hidden="true"/></>}
						<div className={`relative z-10 p-6 sm:p-8 ${previewHeroImage ? "bg-black/10 text-white backdrop-blur-[1px]" : ""}`}><p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: previewHeroImage ? "#ffffff" : previewPrimary }}>Featured storefront</p><h2 className="mt-3 text-3xl font-extrabold sm:text-4xl" style={{ fontFamily: preset.fontHeading }}>{heroTitle}</h2><p className="mt-1 text-2xl font-bold" style={{ color: previewHeroImage ? "#ffffff" : previewAccent }}>{heroHighlight}</p><p className="mt-4 text-sm leading-6" style={{ color: previewHeroImage ? "rgb(255 255 255 / 0.9)" : previewMuted }}>{heroDescription}</p><button type="button" className="mt-6 rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: previewPrimary }}>Shop the collection</button><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-xl border p-4 backdrop-blur-md" style={{ borderColor: previewBorder, backgroundColor: previewSurface }}><span className="block h-12 rounded-lg" style={{ backgroundColor: previewPrimary }} /><span className="mt-3 block text-sm font-semibold">Featured products</span></div><div className="rounded-xl border p-4 backdrop-blur-md" style={{ borderColor: previewBorder, backgroundColor: previewSurface }}><span className="block h-12 rounded-lg" style={{ backgroundColor: previewAccent }} /><span className="mt-3 block text-sm font-semibold">Special offers</span></div></div></div>
					</div>
				</section>
			</div>
		</div>
	)
}
