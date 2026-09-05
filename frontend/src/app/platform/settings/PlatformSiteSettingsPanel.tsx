"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, Send, Upload } from "lucide-react"
import { getPlatformSiteSettingsDefaults, type PlatformSiteSettings, type PlatformTeamMember } from "@/lib/platform-site-settings"
import { optimizeImageForUpload } from "@/lib/image-upload"
import { notifyStoreSettingsPublished } from "@/lib/store-context"

const initialSettings = getPlatformSiteSettingsDefaults()

export default function PlatformSiteSettingsPanel() {
	const [draft, setDraft] = useState<PlatformSiteSettings>(initialSettings)
	const [busy, setBusy] = useState<"loading" | "saving" | "publishing" | "idle">("loading")
	const [uploadingLogo, setUploadingLogo] = useState(false)
	const [uploadingFavicon, setUploadingFavicon] = useState(false)
	const [uploadingTeamImage, setUploadingTeamImage] = useState<string | null>(null)
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [publishedAt, setPublishedAt] = useState<string | null>(null)

	useEffect(() => {
		let active = true
		fetch("/api/platform/settings", { cache: "no-store" })
			.then(async (response) => {
				const data = await response.json().catch(() => ({}))
				if (!response.ok) throw new Error(data.message || "Platform settings are unavailable.")
				if (!active) return
				setDraft(data.draftSettings || initialSettings)
				setPublishedAt(data.publishedAt || null)
			})
			.catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Platform settings are unavailable."))
			.finally(() => active && setBusy("idle"))
		return () => { active = false }
	}, [])

	const updateSection = <K extends keyof PlatformSiteSettings>(section: K, key: string, value: string | boolean) => {
		setDraft((current) => ({ ...current, [section]: { ...(current[section] as Record<string, string | boolean> | undefined), [key]: value } }))
	}

	const request = async (method: "PATCH" | "POST") => {
		setBusy(method === "PATCH" ? "saving" : "publishing")
		setMessage("")
		setError("")
		try {
			const response = await fetch("/api/platform/settings", { method, headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined, body: method === "PATCH" ? JSON.stringify(draft) : undefined })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "The platform settings request failed.")
			if (method === "PATCH") {
				setDraft(data.draftSettings || draft)
				setMessage("Platform settings draft saved.")
			} else {
				setPublishedAt(data.publishedAt || new Date().toISOString())
				setMessage("Platform settings published successfully.")
				notifyStoreSettingsPublished({ scope: "platform", publishedAt: data.publishedAt })
			}
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "The platform settings request failed.")
		} finally {
			setBusy("idle")
		}
	}

	const inputClass = "mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 dark:border-white/10 dark:bg-dark-surface dark:text-white"
	const text = (section: "brand" | "site" | "contact" | "seo" | "social", key: string) => String((draft[section] as Record<string, unknown> | undefined)?.[key] || "")
	const checked = (key: string) => (draft.features as Record<string, boolean> | undefined)?.[key] !== false
	const team = draft.team || []

	function updateTeamMember(id: string, patch: Partial<PlatformTeamMember>) {
		setDraft((current) => ({ ...current, team: (current.team || []).map((member) => member.id === id ? { ...member, ...patch } : member) }))
	}

	function updateTeamSocial(id: string, key: keyof NonNullable<PlatformTeamMember["social"]>, value: string) {
		setDraft((current) => ({ ...current, team: (current.team || []).map((member) => member.id === id ? { ...member, social: { ...member.social, [key]: value } } : member) }))
	}

	function addTeamMember() {
		const id = `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
		setDraft((current) => ({ ...current, team: [...(current.team || []), { id, name: "New team member", role: "Team role", bio: "Add a short description of this team member's contribution to Nurava Tech.", social: {} }] }))
	}

	function removeTeamMember(id: string) {
		setDraft((current) => ({ ...current, team: (current.team || []).filter((member) => member.id !== id) }))
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
			const response = await fetch("/api/platform/settings/logo", { method: "POST", body })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to upload platform logo")
			setDraft((current) => ({ ...current, brand: { ...current.brand, logo: data.url } }))
			setMessage("Platform logo uploaded. Save the draft, then publish it to make it live.")
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to upload platform logo")
		} finally {
			setUploadingLogo(false)
		}
	}

	async function uploadFavicon(file: File | undefined) {
		if (!file) return
		setUploadingFavicon(true)
		setMessage("")
		setError("")
		try {
			const optimized = await optimizeImageForUpload(file)
			const body = new FormData()
			body.set("file", optimized)
			const response = await fetch("/api/platform/settings/favicon", { method: "POST", body })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to upload platform favicon")
			setDraft((current) => ({ ...current, brand: { ...current.brand, favicon: data.url } }))
			setMessage("Platform favicon uploaded. Save the draft, then publish it to make it live.")
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to upload platform favicon")
		} finally {
			setUploadingFavicon(false)
		}
	}

	async function uploadTeamProfileImage(memberId: string, file: File | undefined) {
		if (!file) return
		setUploadingTeamImage(memberId)
		setMessage("")
		setError("")
		try {
			const optimized = await optimizeImageForUpload(file)
			const body = new FormData()
			body.set("file", optimized)
			body.set("memberId", memberId)
			const response = await fetch("/api/platform/settings/team-image", { method: "POST", body })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to upload team profile image")
			updateTeamMember(memberId, { image: data.url })
			setMessage("Team profile image uploaded. Save the draft, then publish it to make it live.")
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to upload team profile image")
		} finally {
			setUploadingTeamImage(null)
		}
	}

	return (
		<div className="space-y-6 pb-12">
			<div>
				<h2 className="text-3xl font-bold">Platform site settings</h2>
				<p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">Manage Nurava Tech platform branding, contact details, social links, visibility, and SEO. These settings affect the platform pages only; each merchant storefront keeps its own settings.</p>
			</div>

			<section className="glass-card space-y-5 p-6">
				<div><h3 className="text-lg font-semibold">Branding and footer</h3><p className="mt-1 text-sm text-gray-500">Leave an asset path unchanged to keep the configured default.</p></div>
				<div className="grid gap-4 lg:grid-cols-2">
					<label className="block"><span className="text-sm font-medium">Platform name</span><input className={inputClass} value={text("brand", "name")} onChange={(event) => updateSection("brand", "name", event.target.value)} /></label>
					<label className="block"><span className="text-sm font-medium">Tagline</span><input className={inputClass} value={text("brand", "tagline")} onChange={(event) => updateSection("brand", "tagline", event.target.value)} /></label>
					<div className="block"><span className="text-sm font-medium">Platform logo</span><div className="mt-2 flex flex-wrap items-center gap-3"><label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${uploadingLogo ? "cursor-wait opacity-60" : ""}`}>{uploadingLogo ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}{uploadingLogo ? "Uploading…" : "Upload logo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingLogo} onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.target.value = "" }} className="sr-only" /></label>{text("brand", "logo") && <img src={text("brand", "logo")} alt="Current platform logo" className="h-12 w-12 rounded-lg border object-contain" />}</div><span className="mt-1 block text-xs text-gray-500">Upload a JPG, PNG, WEBP, or GIF up to 1MB. Save the draft, then publish it to make the logo live on platform pages.</span></div>
					<div className="block"><span className="text-sm font-medium">Platform favicon</span><div className="mt-2 flex flex-wrap items-center gap-3"><label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${uploadingFavicon ? "cursor-wait opacity-60" : ""}`}>{uploadingFavicon ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}{uploadingFavicon ? "Uploading…" : "Upload favicon"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingFavicon} onChange={(event) => { void uploadFavicon(event.target.files?.[0]); event.target.value = "" }} className="sr-only" /></label>{text("brand", "favicon") && <img src={text("brand", "favicon")} alt="Current platform favicon" className="h-10 w-10 rounded-lg border object-contain" />}</div><span className="mt-1 block text-xs text-gray-500">Upload a JPG, PNG, WEBP, or GIF favicon up to 1MB. Save the draft, then publish it to update the platform icon.</span></div>
					<label className="block lg:col-span-2"><span className="text-sm font-medium">Logo alt text</span><input className={inputClass} value={text("brand", "logoAlt")} onChange={(event) => updateSection("brand", "logoAlt", event.target.value)} /></label>
					<label className="block lg:col-span-2"><span className="text-sm font-medium">Footer description</span><textarea className={inputClass} value={text("site", "footerDescription")} onChange={(event) => updateSection("site", "footerDescription", event.target.value)} rows={3} /></label>
				</div>
			</section>

			<section className="glass-card space-y-5 p-6">
				<div><h3 className="text-lg font-semibold">Platform contact</h3><p className="mt-1 text-sm text-gray-500">The WhatsApp number must use digits only with the country code, for example 254740470381.</p></div>
				<div className="grid gap-4 lg:grid-cols-2">
					<label className="block"><span className="text-sm font-medium">Phone display</span><input className={inputClass} value={text("contact", "phoneDisplay")} onChange={(event) => updateSection("contact", "phoneDisplay", event.target.value)} /></label>
					<label className="block"><span className="text-sm font-medium">Support email</span><input type="email" className={inputClass} value={text("contact", "email")} onChange={(event) => updateSection("contact", "email", event.target.value)} /></label>
					<label className="block"><span className="text-sm font-medium">WhatsApp number</span><input inputMode="numeric" className={inputClass} value={text("contact", "whatsappNumber")} onChange={(event) => updateSection("contact", "whatsappNumber", event.target.value.replace(/\D/g, ""))} /></label>
					<label className="block"><span className="text-sm font-medium">Floating WhatsApp and social-link message</span><input className={inputClass} value={text("contact", "whatsappFloatingMessage")} onChange={(event) => updateSection("contact", "whatsappFloatingMessage", event.target.value)} /><span className="mt-1 block text-xs text-gray-500">Used only by the platform floating WhatsApp button and WhatsApp social link. Contact-page chat keeps its existing message.</span></label>
					<label className="block"><span className="text-sm font-medium">Address</span><input className={inputClass} value={text("contact", "addressLine")} onChange={(event) => updateSection("contact", "addressLine", event.target.value)} /></label>
					<label className="block"><span className="text-sm font-medium">City and country</span><input className={inputClass} value={text("contact", "cityCountry")} onChange={(event) => updateSection("contact", "cityCountry", event.target.value)} /></label>
					<label className="block"><span className="text-sm font-medium">Business hours</span><input className={inputClass} value={text("contact", "businessHours")} onChange={(event) => updateSection("contact", "businessHours", event.target.value)} /></label>
					<label className="block"><span className="text-sm font-medium">Response time</span><input className={inputClass} value={text("contact", "responseTime")} onChange={(event) => updateSection("contact", "responseTime", event.target.value)} /></label>
				</div>
			</section>

			<section className="glass-card space-y-5 p-6">
				<div><h3 className="text-lg font-semibold">Social links</h3><p className="mt-1 text-sm text-gray-500">Use HTTPS links. Blank links are omitted from the platform footer.</p></div>
				<div className="grid gap-4 lg:grid-cols-2">
					{(["facebook", "instagram", "tiktok", "linkedin", "youtube", "x"] as const).map((key) => <label className="block" key={key}><span className="text-sm font-medium">{key === "x" ? "X / Twitter" : `${key[0].toUpperCase()}${key.slice(1)}`} URL</span><input type="url" className={inputClass} value={text("social", key)} onChange={(event) => updateSection("social", key, event.target.value)} placeholder="https://" /></label>)}
				</div>
			</section>

			<section className="glass-card space-y-5 p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div><h3 className="text-lg font-semibold">Meet our team</h3><p className="mt-1 max-w-2xl text-sm text-gray-500">Edit the people and roles shown on the platform About page. Profile images are displayed as circular avatars. Changes remain private until published.</p></div>
					<button type="button" onClick={addTeamMember} disabled={team.length >= 12 || busy !== "idle"} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Add team member</button>
				</div>
				<div className="space-y-5">
					{team.map((member) => {
						const uploading = uploadingTeamImage === member.id
						return <div key={member.id} className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div className="flex min-w-0 items-center gap-4">
									<div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-primary/10 text-xl font-bold text-primary">{member.image ? <img src={member.image} alt={`${member.name} profile preview`} className="h-full w-full object-cover" /> : member.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NT"}</div>
									<label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${uploading ? "cursor-wait opacity-60" : ""}`}>{uploading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}{uploading ? "Uploading…" : "Upload profile image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingTeamImage !== null || busy !== "idle"} onChange={(event) => { void uploadTeamProfileImage(member.id, event.target.files?.[0]); event.target.value = "" }} className="sr-only" /></label>
								</div>
								<button type="button" onClick={() => removeTeamMember(member.id)} disabled={busy !== "idle" || uploadingTeamImage !== null} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50">Remove</button>
							</div>
							<div className="mt-4 grid gap-4 md:grid-cols-2">
								<label className="block text-sm font-medium">Name<input className={inputClass} value={member.name} onChange={(event) => updateTeamMember(member.id, { name: event.target.value })} /></label>
								<label className="block text-sm font-medium">Role<input className={inputClass} value={member.role} onChange={(event) => updateTeamMember(member.id, { role: event.target.value })} /></label>
								<label className="block text-sm font-medium md:col-span-2">Short bio<textarea className={inputClass} rows={3} value={member.bio} onChange={(event) => updateTeamMember(member.id, { bio: event.target.value })} /></label>
								{(["linkedin", "instagram", "x", "github"] as const).map((key) => <label className="block text-sm font-medium" key={key}>{key === "x" ? "X / Twitter" : `${key[0].toUpperCase()}${key.slice(1)}`} URL<input type="url" className={inputClass} value={member.social?.[key] || ""} onChange={(event) => updateTeamSocial(member.id, key, event.target.value)} placeholder="https://" /></label>)}
							</div>
							<p className="mt-3 text-xs text-gray-500">JPG, PNG, WEBP, or GIF up to 1MB.</p>
						</div>
					})}
					{!team.length && <p className="rounded-lg border border-dashed p-5 text-sm text-gray-500">No team members configured. Add the Founder/Developer and other platform roles here.</p>}
				</div>
			</section>

			<section className="glass-card space-y-5 p-6">
				<div><h3 className="text-lg font-semibold">SEO and visibility</h3><p className="mt-1 text-sm text-gray-500">These options control platform metadata and public contact surfaces.</p></div>
				<div className="grid gap-4 lg:grid-cols-2">
					<label className="block"><span className="text-sm font-medium">Meta title</span><input className={inputClass} value={text("seo", "title")} onChange={(event) => updateSection("seo", "title", event.target.value)} /></label>
					<label className="block"><span className="text-sm font-medium">Open Graph image URL or path</span><input className={inputClass} value={text("seo", "ogImage")} onChange={(event) => updateSection("seo", "ogImage", event.target.value)} placeholder="https:// or /images/og.png" /></label>
					<label className="block lg:col-span-2"><span className="text-sm font-medium">Meta description</span><textarea className={inputClass} rows={3} value={text("seo", "description")} onChange={(event) => updateSection("seo", "description", event.target.value)} /></label>
					<label className="block lg:col-span-2"><span className="text-sm font-medium">Keywords</span><input className={inputClass} value={text("seo", "keywords")} onChange={(event) => updateSection("seo", "keywords", event.target.value)} /></label>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{(["showWhatsAppButton", "showWhatsAppContact", "showSocialLinks", "showContactCards"] as const).map((key) => <label className="flex items-center gap-3 text-sm" key={key}><input type="checkbox" checked={checked(key)} onChange={(event) => updateSection("features", key, event.target.checked)} /><span>{key === "showWhatsAppButton" ? "Show floating WhatsApp button" : key === "showWhatsAppContact" ? "Show WhatsApp contact link" : key === "showSocialLinks" ? "Show footer social links" : "Show contact cards"}</span></label>)}
				</div>
			</section>

			{error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
			{message && <p role="status" className="text-sm text-green-600 dark:text-green-400">{message}</p>}
			<div className="flex flex-wrap items-center gap-3">
				<button type="button" disabled={busy !== "idle" || uploadingLogo || uploadingFavicon || uploadingTeamImage !== null} onClick={() => request("PATCH")} className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"><Save size={16} />{busy === "saving" ? <><Loader2 size={16} className="animate-spin" />Saving…</> : "Save draft"}</button>
				<button type="button" disabled={busy !== "idle" || uploadingLogo || uploadingFavicon || uploadingTeamImage !== null} onClick={() => request("POST")} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"><Send size={16} />{busy === "publishing" ? <><Loader2 size={16} className="animate-spin" />Publishing…</> : "Publish settings"}</button>
				{publishedAt && <span className="text-xs text-gray-500">Last published {new Date(publishedAt).toLocaleString()}</span>}
			</div>
		</div>
	)
}
