"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, Send, Upload } from "lucide-react"
import { THEME_PRESETS } from "@/config/theme-presets"
import { clientConfig } from "@/config/client.config"
import { getPlatformSiteSettingsDefaults, type PlatformDiscoveryCardKey, type PlatformSiteSettings, type PlatformTeamMember } from "@/lib/platform-site-settings"
import { optimizeImageForUpload } from "@/lib/image-upload"
import { notifyStoreSettingsPublished } from "@/lib/store-context"
import { FONT_SIZE_LABELS, FONT_SIZE_OPTIONS } from "@/lib/font-size-preference"

const initialSettings = getPlatformSiteSettingsDefaults()
const NOVA_ORANGE_SPLASH_COLOR = "#c2410c"
const visualSlots = [
	["darkDesktop", "Dark desktop"],
	["darkTablet", "Dark tablet"],
	["darkMobile", "Dark mobile"],
	["lightDesktop", "Light desktop"],
	["lightTablet", "Light tablet"],
	["lightMobile", "Light mobile"],
] as const
const discoveryCardFields: Array<{ id: PlatformDiscoveryCardKey; label: string }> = [
	{ id: "businesses", label: "For Businesses" },
	{ id: "customers", label: "For Customers" },
	{ id: "compare", label: "Compare" },
	{ id: "choose", label: "Choose" },
	{ id: "buyFromStore", label: "Buy from Store" },
]

export default function PlatformSiteSettingsPanel() {
	const [draft, setDraft] = useState<PlatformSiteSettings>(initialSettings)
	const [busy, setBusy] = useState<"loading" | "saving" | "publishing" | "idle">("loading")
	const [uploadingLogo, setUploadingLogo] = useState(false)
	const [uploadingFavicon, setUploadingFavicon] = useState(false)
	const [uploadingTeamImage, setUploadingTeamImage] = useState<string | null>(null)
	const [uploadingVisual, setUploadingVisual] = useState<string | null>(null)
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
	const updateDiscoveryCard = (id: PlatformDiscoveryCardKey, field: "title" | "text", value: string) => {
		setDraft((current) => ({
			...current,
			discoveryCards: {
				...current.discoveryCards,
				[id]: { ...current.discoveryCards?.[id], [field]: value },
			},
		}))
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
	const assetValue = (key: string) => String(draft.splash?.images?.[key as keyof NonNullable<NonNullable<PlatformSiteSettings["splash"]>["images"]>] || "")
	const selectedPreset = THEME_PRESETS[draft.design?.themePreset as keyof typeof THEME_PRESETS] || THEME_PRESETS["nova-blue-orange"]
	const designColor = (mode: "light" | "dark" | null, key: string) => {
		if (mode === "light" || mode === "dark") {
			return draft.design?.colors?.[mode]?.[key as "background" | "surface" | "text" | "muted" | "border"] || selectedPreset[mode][key as "background" | "surface" | "text" | "muted" | "border"]
		}
		return draft.design?.colors?.[key as "primary" | "primaryDark" | "accent"] || selectedPreset[key as "primary" | "primaryDark" | "accent"]
	}
	const defaultGlassValue = (key: string) => {
		if (key === "blurPx") return 12
		if (key === "cardRadiusPx") {
			const [amount, unit] = selectedPreset.cardRadius.match(/[\d.]+|[a-z%]+/gi) || ["16", "px"]
			return Math.round(Number(amount) * (unit === "rem" ? 16 : 1))
		}
		const mode = key.startsWith("light") ? "light" : "dark"
		const property = key.endsWith("Opacity") ? "glassBorder" : "glassBackground"
		const match = selectedPreset[mode][property].match(/,\s*([\d.]+)\)$/)
		return Math.round(Number(match?.[1] || (property === "glassBorder" ? 0.15 : 0.5)) * 100)
	}

	function updateVisualText(section: "splash" | "design", key: string, value: string | boolean | number) {
		setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } }))
	}

	function updateDesignColor(mode: "light" | "dark" | null, key: string, value: string) {
		setDraft((current) => {
			const colors = current.design?.colors || {}
			return { ...current, design: { ...current.design, colors: mode === "light"
				? { ...colors, light: { ...colors.light, [key]: value } }
				: mode === "dark"
					? { ...colors, dark: { ...colors.dark, [key]: value } }
					: { ...colors, [key]: value } } }
		})
	}

	function updateDesignField(group: "typography" | "glass", key: string, value: string | number) {
		setDraft((current) => {
			const design = { ...current.design }
			if (group === "typography") {
				const typography = { ...design.typography }
				if (key === "fontSize") typography.fontSize = value as NonNullable<typeof typography.fontSize>
				else if (value === "theme") delete typography[key as "bodyFont" | "headingFont"]
				else if (key === "bodyFont") typography.bodyFont = value as NonNullable<typeof typography.bodyFont>
				else typography.headingFont = value as NonNullable<typeof typography.headingFont>
				design.typography = typography
			} else {
				const glass = { ...design.glass }
				if (key === "shadow") {
					if (value === "theme") delete glass.shadow
					else glass.shadow = value as NonNullable<typeof glass.shadow>
				} else glass[key as Exclude<keyof typeof glass, "shadow">] = Number(value)
				design.glass = glass
			}
			return { ...current, design }
		})
	}

	function selectThemePreset(value: string) {
		setDraft((current) => ({ ...current, design: { themePreset: value } }))
	}

	async function uploadVisualAsset(section: "splash", slot: string, file: File | undefined) {
		if (!file) return
		const uploadId = `${section}.${slot}`
		setUploadingVisual(uploadId)
		setMessage("")
		setError("")
		try {
			const optimized = await optimizeImageForUpload(file)
			const body = new FormData()
			body.set("file", optimized)
			body.set("section", section)
			body.set("slot", slot)
			const response = await fetch("/api/platform/settings/visual", { method: "POST", body })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to upload platform visual")
			setDraft((current) => ({
				...current,
				[section]: slot === "logo"
					? { ...current[section], logo: data.url }
					: { ...current[section], images: { ...current[section]?.images, [slot]: data.url } },
			}))
			setMessage("Platform image uploaded. Save the draft, then publish it to make it live.")
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to upload platform visual")
		} finally {
			setUploadingVisual(null)
		}
	}

	function updateTeamMember(id: string, patch: Partial<PlatformTeamMember>) {
		setDraft((current) => ({ ...current, team: (current.team || []).map((member) => member.id === id ? { ...member, ...patch } : member) }))
	}

	function updateTeamSocial(id: string, key: keyof NonNullable<PlatformTeamMember["social"]>, value: string) {
		setDraft((current) => ({ ...current, team: (current.team || []).map((member) => member.id === id ? { ...member, social: { ...member.social, [key]: value } } : member) }))
	}

	function addTeamMember() {
		const id = `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
		setDraft((current) => ({ ...current, team: [...(current.team || []), { id, name: "New team member", role: "Team role", bio: "Add a short description of this team member's contribution to Nurava HubStores.", social: {} }] }))
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
				<p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">Manage Nurava HubStores platform branding, contact details, social links, visibility, and SEO. These settings affect the platform pages only; each merchant storefront keeps its own settings.</p>
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
				<div><h3 className="text-lg font-semibold">Platform homepage hero</h3><p className="mt-1 text-sm text-gray-500">Edit the heading and supporting text shown in the responsive glass hero card. Text is used in light and dark modes; hero artwork is no longer displayed.</p></div>
				<div className="grid gap-4">
					<label className="block"><span className="text-sm font-medium">Main heading</span><input maxLength={180} className={inputClass} value={draft.hero?.title || ""} onChange={(event) => updateSection("hero", "title", event.target.value)} /><span className="mt-1 block text-xs text-gray-500">For example: Nurava HubStores is the technology platform</span></label>
					<label className="block"><span className="text-sm font-medium">Highlighted heading</span><input maxLength={120} className={inputClass} value={draft.hero?.highlight || ""} onChange={(event) => updateSection("hero", "highlight", event.target.value)} /><span className="mt-1 block text-xs text-gray-500">For example: connecting you with trusted stores</span></label>
					<label className="block"><span className="text-sm font-medium">Supporting text</span><textarea maxLength={320} rows={3} className={inputClass} value={draft.hero?.description || ""} onChange={(event) => updateSection("hero", "description", event.target.value)} /></label>
				</div>
			</section>

			<section className="glass-card space-y-5 p-6">
				<div><h3 className="text-lg font-semibold">Platform homepage discovery cards</h3><p className="mt-1 text-sm text-gray-500">Edit the bold headings and supporting text shown beneath the homepage hero. The icons and card order stay fixed. Empty fields use the default wording.</p></div>
				<div className="grid gap-5 lg:grid-cols-2">
					{discoveryCardFields.map(({ id, label }) => <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/10" key={id}>
						<h4 className="font-semibold">{label}</h4>
						<label className="block"><span className="text-sm font-medium">Bold heading</span><input maxLength={120} className={inputClass} value={draft.discoveryCards?.[id]?.title || ""} onChange={(event) => updateDiscoveryCard(id, "title", event.target.value)} /></label>
						<label className="block"><span className="text-sm font-medium">Supporting text</span><textarea maxLength={240} rows={2} className={inputClass} value={draft.discoveryCards?.[id]?.text || ""} onChange={(event) => updateDiscoveryCard(id, "text", event.target.value)} /></label>
					</div>)}
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
				<div><h3 className="text-lg font-semibold">Platform splash screen</h3><p className="mt-1 text-sm text-gray-500">Choose responsive artwork, a solid color, or a glassmorphism surface. Glass mode follows the platform design background and glass settings in both light and dark mode. Selecting color or glass hides the splash background images without deleting them.</p></div>
				<label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.splash?.enabled !== false} onChange={(event) => updateVisualText("splash", "enabled", event.target.checked)} /><span>Enable splash screen on platform homepage visits</span></label>
				<label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.splash?.showProgress !== false} onChange={(event) => updateVisualText("splash", "showProgress", event.target.checked)} /><span>Show progress bar, percentage, and loading ellipsis</span></label>
				<div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="text-sm font-medium">Welcome text</span><input className={inputClass} value={draft.splash?.welcomeText || ""} onChange={(event) => updateVisualText("splash", "welcomeText", event.target.value)} /></label><label className="block"><span className="text-sm font-medium">Loading text</span><input className={inputClass} value={draft.splash?.loadingText || ""} onChange={(event) => updateVisualText("splash", "loadingText", event.target.value)} /></label></div>
				<div className="grid gap-4 md:grid-cols-2">
					<label className="block"><span className="text-sm font-medium">Splash background style</span><select className={inputClass} value={draft.splash?.backgroundMode || "glass"} onChange={(event) => updateVisualText("splash", "backgroundMode", event.target.value)}><option value="glass">Platform glass theme</option><option value="color">Solid background color</option><option value="images">Responsive background images</option></select><span className="mt-1 block text-xs text-gray-500">Color and glass modes override images on every device and in both theme modes.</span></label>
					{draft.splash?.backgroundMode === "color" && <>
						<label className="block">
							<span className="text-sm font-medium">Splash background color</span>
							<div className="mt-2 flex items-center gap-3">
								<input aria-label="Splash background color" type="color" className="h-12 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-white/10 dark:bg-dark-surface" value={draft.splash?.backgroundColor || "#071a2c"} onChange={(event) => updateVisualText("splash", "backgroundColor", event.target.value)} />
								<span className="text-sm text-gray-500">{draft.splash?.backgroundColor || "#071a2c"}</span>
							</div>
							<button
								type="button"
								aria-label={`Use Nova Orange ${NOVA_ORANGE_SPLASH_COLOR} for the splash background`}
								aria-pressed={(draft.splash?.backgroundColor || "").toLowerCase() === NOVA_ORANGE_SPLASH_COLOR}
								onClick={() => updateVisualText("splash", "backgroundColor", NOVA_ORANGE_SPLASH_COLOR)}
								className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-white/15"
							>
								<span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/15" style={{ backgroundColor: NOVA_ORANGE_SPLASH_COLOR }} />
								Use Nova Orange <span className="text-gray-500">{NOVA_ORANGE_SPLASH_COLOR}</span>
							</button>
						</label>
						<label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.splash?.centerContentOnColor !== false} onChange={(event) => updateVisualText("splash", "centerContentOnColor", event.target.checked)} /><span>Center welcome content on the solid-color splash</span></label>
					</>}
				</div>
				<div className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
					<div>
						<p className="text-sm font-medium">Splash logo</p>
						<p className="mt-1 text-xs text-gray-500">Shown between the animated platform name and loading progress. It also appears in the Android app splash. If no custom logo is uploaded, the current app splash logo is used.</p>
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-4">
						<img src={draft.splash?.logo || clientConfig.brand.logo} alt="Splash logo preview" className="h-14 w-14 rounded-lg object-contain" />
						<label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${uploadingVisual === "splash.logo" ? "cursor-wait opacity-60" : ""}`}>
							{uploadingVisual === "splash.logo" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
							{uploadingVisual === "splash.logo" ? "Uploading…" : "Upload logo"}
							<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingVisual !== null} onChange={(event) => { void uploadVisualAsset("splash", "logo", event.target.files?.[0]); event.target.value = "" }} className="sr-only" />
						</label>
					</div>
				</div>
				{draft.splash?.backgroundMode === "images" && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visualSlots.map(([slot, label]) => { const id = `splash.${slot}`; return <div key={id} className="rounded-lg border border-gray-200 p-3 dark:border-white/10"><p className="text-sm font-medium">{label}</p>{assetValue(slot) && <img src={assetValue(slot)} alt={`${label} splash preview`} className="mt-2 h-24 w-full rounded object-cover" />}<label className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${uploadingVisual === id ? "cursor-wait opacity-60" : ""}`}>{uploadingVisual === id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{uploadingVisual === id ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingVisual !== null} onChange={(event) => { void uploadVisualAsset("splash", slot, event.target.files?.[0]); event.target.value = "" }} className="sr-only" /></label></div> })}</div>}
			</section>

			<section className="glass-card space-y-5 p-6">
				<div><h3 className="text-lg font-semibold">Platform design</h3><p className="mt-1 text-sm text-gray-500">Customize platform-only theme colors, typography, and glass effects in both color modes. Merchant storefront settings and themes are isolated and remain unchanged.</p></div>
				<label className="block max-w-xl text-sm font-medium">Theme preset<select className={inputClass} value={draft.design?.themePreset || "nova-blue-orange"} onChange={(event) => selectThemePreset(event.target.value)}>{Object.values(THEME_PRESETS).map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select><span className="mt-1 block text-xs text-gray-500">Selecting a preset resets custom overrides to that preset. You can then refine the settings below.</span></label>
				<div className="grid gap-5 xl:grid-cols-3">
					<div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/10">
						<div><h4 className="font-semibold">Brand colors</h4><p className="text-xs text-gray-500">Primary actions and highlights.</p></div>
						<div className="grid grid-cols-2 gap-3">{([ ["primary", "Primary"], ["primaryDark", "Primary hover"], ["accent", "Accent"] ] as const).map(([key, label]) => <label className="block text-sm" key={key}>{label}<input aria-label={`${label} color`} type="color" className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-white/10 dark:bg-dark-surface" value={designColor(null, key)} onChange={(event) => updateDesignColor(null, key, event.target.value)} /><span className="text-xs text-gray-500">{designColor(null, key)}</span></label>)}</div>
					</div>
					{(["light", "dark"] as const).map((mode) => <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/10" key={mode}>
						<div><h4 className="font-semibold">{mode === "light" ? "Light mode" : "Dark mode"} colors</h4><p className="text-xs text-gray-500">Background, cards, text, and borders.</p></div>
						<div className="grid grid-cols-2 gap-3">{([ ["background", "Background"], ["surface", "Card / surface"], ["text", "Text"], ["muted", "Muted text"], ["border", "Borders"] ] as const).map(([key, label]) => <label className="block text-sm" key={key}>{label}<input aria-label={`${mode} ${label} color`} type="color" className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-white/10 dark:bg-dark-surface" value={designColor(mode, key)} onChange={(event) => updateDesignColor(mode, key, event.target.value)} /><span className="text-xs text-gray-500">{designColor(mode, key)}</span></label>)}</div>
					</div>)}
				</div>
				<div className="grid gap-5 lg:grid-cols-2">
					<div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-white/10">
						<div><h4 className="font-semibold">Typography</h4><p className="text-xs text-gray-500">Choose readable font stacks and a platform-wide text size. Size changes apply to the platform site; each signed-in account can choose its own size in account settings.</p></div>
						<div className="grid gap-4 sm:grid-cols-2">{([ ["bodyFont", "Body font"], ["headingFont", "Heading font"] ] as const).map(([key, label]) => <label className="block text-sm font-medium" key={key}>{label}<select className={inputClass} value={draft.design?.typography?.[key] || "theme"} onChange={(event) => updateDesignField("typography", key, event.target.value)}><option value="theme">Theme default</option><option value="system">System sans-serif</option><option value="inter">Inter-style sans-serif</option><option value="georgia">Georgia serif</option><option value="trebuchet">Trebuchet MS</option><option value="verdana">Verdana</option></select></label>)}<label className="block text-sm font-medium">Platform font size<select className={inputClass} value={draft.design?.typography?.fontSize || "normal"} onChange={(event) => updateDesignField("typography", "fontSize", event.target.value)}>{FONT_SIZE_OPTIONS.map((option) => <option value={option} key={option}>{FONT_SIZE_LABELS[option]}</option>)}</select><span className="mt-1 block text-xs font-normal text-gray-500">This default is used unless an account has selected a personal font size.</span></label></div>
					</div>
					<div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-white/10">
						<div><h4 className="font-semibold">Glassmorphism</h4><p className="text-xs text-gray-500">Tune transparency, edges, blur, card corners, and shadows.</p></div>
						<div className="grid gap-4 sm:grid-cols-2">
							{([ ["blurPx", "Backdrop blur", 0, 32, "px"], ["cardRadiusPx", "Card corner radius", 0, 32, "px"], ["lightOpacity", "Light surface opacity", 0, 100, "%"], ["darkOpacity", "Dark surface opacity", 0, 100, "%"], ["lightBorderOpacity", "Light border opacity", 0, 100, "%"], ["darkBorderOpacity", "Dark border opacity", 0, 100, "%"] ] as const).map(([key, label, min, max, unit]) => { const value = draft.design?.glass?.[key] ?? defaultGlassValue(key); return <label className="block text-sm" key={key}>{label}<div className="mt-2 flex items-center gap-3"><input aria-label={label} type="range" min={min} max={max} value={value} onChange={(event) => updateDesignField("glass", key, Number(event.target.value))} className="min-w-0 flex-1" /><output className="w-12 text-right text-xs text-gray-500">{value}{unit}</output></div></label> })}
							<label className="block text-sm font-medium sm:col-span-2">Shadow<select className={inputClass} value={draft.design?.glass?.shadow || "theme"} onChange={(event) => updateDesignField("glass", "shadow", event.target.value)}><option value="theme">Theme default</option><option value="none">None</option><option value="soft">Soft</option><option value="balanced">Balanced</option><option value="bold">Bold</option></select></label>
						</div>
					</div>
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

			<section className="glass-card space-y-5 p-6">
				<div><h3 className="text-lg font-semibold">Platform legal pages</h3><p className="mt-1 text-sm text-gray-500">Edit the platform Terms, Privacy Policy, and Cookie Policy without changing merchant storefront legal content.</p></div>
				<label className="block"><span className="text-sm font-medium">Terms and Conditions</span><textarea rows={7} className={inputClass} value={draft.legal?.terms || ""} onChange={(event) => setDraft((current) => ({ ...current, legal: { ...current.legal, terms: event.target.value } }))} /></label>
				<label className="block"><span className="text-sm font-medium">Privacy Policy</span><textarea rows={7} className={inputClass} value={draft.legal?.privacy || ""} onChange={(event) => setDraft((current) => ({ ...current, legal: { ...current.legal, privacy: event.target.value } }))} /></label>
				<label className="block"><span className="text-sm font-medium">Cookie Policy</span><textarea rows={7} className={inputClass} value={draft.legal?.cookies || ""} onChange={(event) => setDraft((current) => ({ ...current, legal: { ...current.legal, cookies: event.target.value } }))} /></label>
			</section>

			{error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
			{message && <p role="status" className="text-sm text-green-600 dark:text-green-400">{message}</p>}
			<div className="flex flex-wrap items-center gap-3">
				<button type="button" disabled={busy !== "idle" || uploadingLogo || uploadingFavicon || uploadingTeamImage !== null || uploadingVisual !== null} onClick={() => request("PATCH")} className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"><Save size={16} />{busy === "saving" ? <><Loader2 size={16} className="animate-spin" />Saving…</> : "Save draft"}</button>
				<button type="button" disabled={busy !== "idle" || uploadingLogo || uploadingFavicon || uploadingTeamImage !== null || uploadingVisual !== null} onClick={() => request("POST")} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"><Send size={16} />{busy === "publishing" ? <><Loader2 size={16} className="animate-spin" />Publishing…</> : "Publish settings"}</button>
				{publishedAt && <span className="text-xs text-gray-500">Last published {new Date(publishedAt).toLocaleString()}</span>}
			</div>
		</div>
	)
}
