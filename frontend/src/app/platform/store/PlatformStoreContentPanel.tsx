"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Loader2, Upload } from "lucide-react"
import PlatformStoreCategoryImages from "./PlatformStoreCategoryImages"
import { notifyStoreSettingsPublished } from "@/lib/store-context"

type Content = { name: string; logoUrl: string; heroImage: string; heroTitle: string; heroHighlight: string; heroDescription: string; heroPrimaryLabel: string; featuredTitle: string; categoryTitle: string; aboutTitle: string; aboutDescription: string; phoneDisplay: string; email: string; addressLine: string; facebook: string; instagram: string; tiktok: string; categoryImages: Record<string, string> }
type StoreCategory = { slug: string; name: string; imageUrl: string | null; industry: { name: string; slug: string } | null }
const blank: Content = { name: "", logoUrl: "", heroImage: "", heroTitle: "", heroHighlight: "", heroDescription: "", heroPrimaryLabel: "", featuredTitle: "", categoryTitle: "", aboutTitle: "", aboutDescription: "", phoneDisplay: "", email: "", addressLine: "", facebook: "", instagram: "", tiktok: "", categoryImages: {} }
type ContentTextKey = Exclude<keyof Content, "categoryImages">
type UploadTarget = "logoUrl" | "heroImage"
type ValidationIssues = { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
const input = "w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:bg-dark-surface"
const fieldLabels: Record<string, string> = { name: "Store name", logoUrl: "Store logo", heroImage: "Hero image", heroTitle: "Hero title", heroHighlight: "Hero highlighted text", heroDescription: "Hero description", heroPrimaryLabel: "Hero button label", featuredTitle: "Featured products title", categoryTitle: "Category section title", aboutTitle: "About section title", aboutDescription: "About section description", phoneDisplay: "Customer support phone", email: "Customer support email", addressLine: "Store address", facebook: "Facebook URL", instagram: "Instagram URL", tiktok: "TikTok URL", categoryImages: "Category card images" }

export default function PlatformStoreContentPanel({ notify }: { notify: (message: string) => void }) {
	const [content, setContent] = useState<Content>(blank)
	const [categories, setCategories] = useState<StoreCategory[]>([])
	const [storeSlug, setStoreSlug] = useState("")
	const [busy, setBusy] = useState(false)
	const [saveMessage, setSaveMessage] = useState<{ kind: "success" | "error"; text: string; details?: string[] } | null>(null)
	const [uploadingTarget, setUploadingTarget] = useState<UploadTarget | null>(null)
	const [uploadingCategoryKey, setUploadingCategoryKey] = useState<string | null>(null)
	const isUploading = uploadingTarget !== null || uploadingCategoryKey !== null
	const load = useCallback(async () => {
		const response = await fetch("/api/platform/store/content", { cache: "no-store" }); const data = await response.json()
		if (!response.ok) throw new Error(data.message || "Store content is unavailable")
		const store = data.store || {}; const home = store.homepageSettings || {}; const contact = store.contactSettings || {}
		setStoreSlug(store.slug || "")
		const social = contact.social || {}
		setCategories(data.categories || [])
		setContent({ name: store.name || "", logoUrl: store.logoUrl || "", heroImage: home.heroImage || "", heroTitle: home.heroTitle || "", heroHighlight: home.heroHighlight || "", heroDescription: home.heroDescription || "", heroPrimaryLabel: home.heroPrimaryLabel || "", featuredTitle: home.featuredTitle || "", categoryTitle: home.categoryTitle || "", aboutTitle: home.aboutTitle || "", aboutDescription: home.aboutDescription || "", phoneDisplay: contact.phoneDisplay || "", email: contact.email || "", addressLine: contact.addressLine || "", facebook: social.facebook || "", instagram: social.instagram || "", tiktok: social.tiktok || "", categoryImages: home.categoryImages || {} })
	}, [])
	useEffect(() => { void load().catch((error: unknown) => notify(error instanceof Error ? error.message : "Unable to load store content")) }, [load, notify])
	function update(key: ContentTextKey, value: string) { setSaveMessage(null); setContent((current) => ({ ...current, [key]: value })) }
	async function upload(file: File | undefined, target: "logoUrl" | "heroImage" | "categoryImage", categorySlug?: string) {
		if (!file || (target === "categoryImage" && !categorySlug)) return
		setSaveMessage(null)
		if (target === "categoryImage") setUploadingCategoryKey(categorySlug!)
		else setUploadingTarget(target)
		try {
			const form = new FormData()
			form.set("file", file)
			const response = await fetch("/api/platform/store/catalog/upload", { method: "POST", body: form })
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Image upload failed")
			if (target === "categoryImage" && categorySlug) setContent((current) => ({ ...current, categoryImages: { ...current.categoryImages, [categorySlug]: data.url } }))
			else if (target !== "categoryImage") update(target, data.url)
			notify(target === "logoUrl" ? "Store logo uploaded" : target === "heroImage" ? "Hero image uploaded" : "Category image uploaded")
		} catch (error) {
			notify(error instanceof Error ? error.message : "Image upload failed")
		} finally {
			if (target === "categoryImage") setUploadingCategoryKey(null)
			else setUploadingTarget(null)
		}
	}
	async function uploadCategoryImage(file: File | undefined, slug: string) { await upload(file, "categoryImage", slug) }
	function removeCategoryImage(slug: string) { setSaveMessage(null); setContent((current) => { const categoryImages = { ...current.categoryImages }; delete categoryImages[slug]; return { ...current, categoryImages } }) }
	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); setBusy(true); setSaveMessage(null)
		try {
			const response = await fetch("/api/platform/store/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) {
				const issues = data.issues as ValidationIssues | undefined
				const details = [
					...Object.entries(issues?.fieldErrors || {}).flatMap(([key, messages]) => messages.map((message) => `${fieldLabels[key] || key}: ${message}`)),
					...(issues?.formErrors || []),
				]
				const message = typeof data.message === "string" ? data.message : "Store content could not be saved"
				setSaveMessage({ kind: "error", text: message, details })
				return
			}
			notifyStoreSettingsPublished({ scope: "store", storeSlug })
			notify("Platform store content saved")
			setSaveMessage({ kind: "success", text: "Store content saved successfully." })
			try {
				await load()
			} catch {
				setSaveMessage({ kind: "success", text: "Store content was saved, but the latest values could not be reloaded. Refresh this page to confirm them." })
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Store content could not be saved"
			setSaveMessage({ kind: "error", text: message })
			notify(message)
		} finally { setBusy(false) }
	}
	const fields: Array<[ContentTextKey, string]> = [["name", "Store name"], ["heroTitle", "Hero title"], ["heroHighlight", "Hero highlighted text"], ["heroPrimaryLabel", "Hero button label"], ["categoryTitle", "Category section title"], ["featuredTitle", "Featured products title"], ["aboutTitle", "About section title"], ["phoneDisplay", "Customer support phone"], ["email", "Customer support email"], ["addressLine", "Store address"], ["facebook", "Facebook URL"], ["instagram", "Instagram URL"], ["tiktok", "TikTok URL"]]
	return <section className="glass-card p-5"><h3 className="text-xl font-semibold">Platform store content</h3><p className="mt-1 text-sm text-gray-500">Customize the platform-owned store content and catalog images. Store contact and social details set here override the Platform Admin defaults; footer branding and legal settings continue to come from Platform Admin site settings.</p>{saveMessage && <div role={saveMessage.kind === "error" ? "alert" : "status"} className={`mt-3 rounded-lg border p-3 text-sm ${saveMessage.kind === "error" ? "border-red-500/40 bg-red-500/5 text-red-700" : "border-green-600/40 bg-green-500/5 text-green-700"}`}><p>{saveMessage.text}</p>{!!saveMessage.details?.length && <ul className="mt-2 list-inside list-disc space-y-1">{saveMessage.details.map((detail, index) => <li key={`${index}-${detail}`}>{detail}</li>)}</ul>}</div>}<form onSubmit={(event) => void save(event)} className="mt-4 space-y-4"><div className="grid gap-3 sm:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="space-y-1 text-sm"><span>{label}</span><input className={input} type={key === "email" ? "email" : "text"} value={content[key]} onChange={(event) => update(key, event.target.value)}/></label>)}</div>{([ ["heroDescription", "Hero description"], ["aboutDescription", "About section description"] ] as const).map(([key, label]) => <label key={key} className="block space-y-1 text-sm"><span>{label}</span><textarea className={input} rows={3} value={content[key]} onChange={(event) => update(key, event.target.value)}/></label>)}<PlatformStoreCategoryImages categories={categories} images={content.categoryImages} uploadingKey={uploadingCategoryKey} disabled={isUploading || busy} upload={(file, slug) => { void uploadCategoryImage(file, slug) }} remove={removeCategoryImage}/><div className="flex flex-wrap items-center gap-3"><label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${uploadingTarget === "logoUrl" ? "cursor-wait opacity-60" : ""}`}>{uploadingTarget === "logoUrl" ? <><Loader2 size={15} className="animate-spin"/>Uploading…</> : <><Upload size={15}/>Upload store logo</>}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={isUploading || busy} onChange={(event) => { void upload(event.target.files?.[0], "logoUrl"); event.target.value = "" }}/></label>{content.logoUrl && <img src={content.logoUrl} alt="Platform store logo preview" className="brand-logo-image h-14 w-14 rounded-lg border"/>}<label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${uploadingTarget === "heroImage" ? "cursor-wait opacity-60" : ""}`}>{uploadingTarget === "heroImage" ? <><Loader2 size={15} className="animate-spin"/>Uploading…</> : <><Upload size={15}/>Upload hero image</>}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={isUploading || busy} onChange={(event) => { void upload(event.target.files?.[0], "heroImage"); event.target.value = "" }}/></label>{content.heroImage && <img src={content.heroImage} alt="Platform store hero preview" className="h-14 w-24 rounded-lg border object-cover"/>}<span className="text-xs text-gray-500">JPG, PNG, WEBP, or GIF up to 1 MB.</span></div><button className="btn-primary rounded-lg px-4 py-2 text-sm" disabled={busy || isUploading}>{busy ? "Saving…" : "Save store content"}</button></form></section>
}
