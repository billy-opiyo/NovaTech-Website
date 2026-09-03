"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle2, Palette, Save, Bell, Megaphone, Camera, Upload, Loader2 } from "lucide-react"
import { useTheme } from "@/components/providers/ThemeProvider"
import { useToast } from "@/components/ui/Toast"
import { IMAGE_TOO_LARGE_MESSAGE, isImageTooLarge } from "@/lib/upload-limits"

type Settings = {
	name: string
	email: string
	image: string | null
	emailVerified: string | null
	marketingEmails: boolean
	orderUpdates: boolean
	preferredTheme: "light" | "dark"
}

const defaults: Settings = { name: "", email: "", image: null, emailVerified: null, marketingEmails: false, orderUpdates: true, preferredTheme: "dark" }

export default function AccountSettingsPage() {
	const { theme, setTheme } = useTheme()
	const { addToast } = useToast()
	const [settings, setSettings] = useState<Settings>(defaults)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [uploading, setUploading] = useState(false)

	useEffect(() => {
		fetch("/api/account/settings")
			.then(async (response) => {
				if (!response.ok) throw new Error("Unable to load your settings.")
				return response.json()
			})
			.then((data) => setSettings({ ...defaults, ...data.user }))
			.catch((reason) => setError(reason.message))
			.finally(() => setLoading(false))
	}, [])

	function update<K extends keyof Settings>(key: K, value: Settings[K]) {
		setSettings((current) => ({ ...current, [key]: value }))
		if (key === "preferredTheme") setTheme(value as "light" | "dark")
	}

	async function save(event: React.FormEvent) {
		event.preventDefault(); setSaving(true); setMessage(""); setError("")
		const response = await fetch("/api/account/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: settings.name, marketingEmails: settings.marketingEmails, orderUpdates: settings.orderUpdates, preferredTheme: settings.preferredTheme }) })
		const data = await response.json()
		if (!response.ok) setError(data.message || "Unable to save your settings.")
		else { setSettings({ ...defaults, ...data.user }); setTheme(data.user.preferredTheme); setMessage("Your preferences have been saved.") }
		setSaving(false)
	}

	async function uploadProfileImage(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		if (!file) return
		if (isImageTooLarge(file)) {
			setError(IMAGE_TOO_LARGE_MESSAGE)
			addToast(IMAGE_TOO_LARGE_MESSAGE, "error")
			event.target.value = ""
			return
		}
		setUploading(true); setMessage(""); setError("")
		const body = new FormData()
		body.append("file", file)
		try {
			const response = await fetch("/api/account/settings", { method: "POST", body })
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Unable to upload your profile image.")
			setSettings((current) => ({ ...current, ...data.user }))
			setMessage("Your profile picture has been updated.")
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Unable to upload your profile image."
			setError(message)
			addToast(message, "error")
		} finally {
			setUploading(false)
			event.target.value = ""
		}
	}

	if (loading) return <div className="py-20 text-center text-gray-500">Loading your settings…</div>

	return <div className="mx-auto max-w-3xl space-y-8 py-6 sm:py-10">
		<div><h1 className="text-3xl font-bold">Account settings</h1><p className="mt-2 text-gray-500">Choose how Nurava Tech looks and how we keep you informed.</p></div>
		<form onSubmit={save} className="space-y-6">
			<section className="glass-card p-6">
				<h2 className="mb-5 flex items-center gap-2 text-xl font-semibold"><Palette className="text-primary" size={21} /> Profile and appearance</h2>
				<div className="mb-6 flex flex-col items-start gap-4 rounded-xl bg-black/5 p-4 sm:flex-row sm:items-center dark:bg-white/5">
					<div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-primary">
						{settings.image ? <img src={settings.image} alt="Your profile" className="h-full w-full object-cover" /> : <Camera size={38} />}
					</div>
					<div><p className="font-medium">Profile picture</p><p className="mt-1 text-sm text-gray-500">Upload a JPG, PNG, WEBP, or GIF up to 1MB.</p><label className="btn-primary mt-3 inline-flex cursor-pointer items-center gap-2">{uploading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} />}{uploading ? "Uploading…" : "Choose image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadProfileImage} disabled={uploading} className="sr-only" /></label></div>
				</div>
				<div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Full name<input required minLength={2} value={settings.name} onChange={(event) => update("name", event.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-primary" /></label><div><span className="block text-sm font-medium">Email address</span><p className="mt-2 rounded-lg bg-black/5 px-4 py-3 text-gray-500 dark:bg-white/5">{settings.email}</p><p className="mt-2 text-xs text-green-600">{settings.emailVerified ? "Email verified" : "Email not verified"}</p></div></div>
				<div className="mt-5"><p className="mb-2 text-sm font-medium">Theme</p><div className="flex flex-wrap gap-3">{(["light", "dark"] as const).map((option) => <button type="button" key={option} onClick={() => update("preferredTheme", option)} className={`rounded-lg border px-4 py-2 text-sm capitalize transition ${settings.preferredTheme === option || (!settings.preferredTheme && theme === option) ? "border-primary bg-primary text-white" : "border-gray-300 dark:border-gray-600 hover:border-primary"}`}>{option}</button>)}</div></div>
			</section>
			<section className="glass-card p-6"><h2 className="mb-5 flex items-center gap-2 text-xl font-semibold"><Bell className="text-primary" size={21} /> Notifications</h2><div className="space-y-4"><label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-black/5 p-4 dark:bg-white/5"><span className="flex gap-3"><Bell className="mt-0.5 text-primary" size={19} /><span><span className="block font-medium">Order updates</span><span className="text-sm text-gray-500">Receive important updates about delivery and payment.</span></span></span><input type="checkbox" checked={settings.orderUpdates} onChange={(event) => update("orderUpdates", event.target.checked)} className="mt-1 h-5 w-5 accent-primary" /></label><label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-black/5 p-4 dark:bg-white/5"><span className="flex gap-3"><Megaphone className="mt-0.5 text-accent" size={19} /><span><span className="block font-medium">Deals and product news</span><span className="text-sm text-gray-500">Get occasional offers, new arrivals, and useful store updates.</span></span></span><input type="checkbox" checked={settings.marketingEmails} onChange={(event) => update("marketingEmails", event.target.checked)} className="mt-1 h-5 w-5 accent-primary" /></label></div></section>
			{error && <p className="text-sm text-red-500">{error}</p>}{message && <p className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 size={16} />{message}</p>}
			<div className="flex flex-wrap items-center gap-4"><button disabled={saving} aria-busy={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} />}{saving ? "Saving…" : "Save preferences"}</button><Link href="/account" className="text-sm text-gray-500 hover:text-primary">Back to account</Link></div>
		</form>
	</div>
}
