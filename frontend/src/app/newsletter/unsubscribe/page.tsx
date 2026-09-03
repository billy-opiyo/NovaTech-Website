"use client"

import { useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/Toast"

export default function NewsletterUnsubscribePage() {
	const [email, setEmail] = useState("")
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [saving, setSaving] = useState(false)
	const { addToast } = useToast()

	async function submit(event: React.FormEvent) {
		event.preventDefault()
		setSaving(true); setMessage(""); setError("")
		try {
			const response = await fetch("/api/newsletter/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Unable to update your subscription.")
			setMessage(data.message)
			addToast(data.message || "You have been unsubscribed successfully.", "success")
			setEmail("")
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Unable to update your subscription."
			setError(message)
			addToast(message, "error")
		} finally { setSaving(false) }
	}

	return <main className="mx-auto max-w-lg px-6 py-16"><div className="glass-card p-6 sm:p-8"><Link href="/" className="text-sm text-gray-500 hover:text-primary">Back to store</Link><h1 className="mt-4 text-3xl font-bold">Unsubscribe from store news</h1><p className="mt-3 text-gray-500">Enter your email address to stop promotional store messages.</p><form onSubmit={submit} className="mt-6 space-y-4"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3" /><button disabled={saving} className="btn-primary w-full disabled:opacity-50">{saving ? "Updating…" : "Unsubscribe"}</button></form>{message && <p className="mt-4 text-sm text-green-600">{message}</p>}{error && <p className="mt-4 text-sm text-red-500">{error}</p>}</div></main>
}
