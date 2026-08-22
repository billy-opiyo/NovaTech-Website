"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/Toast"
import { useStoreContext } from "@/lib/store-context"

export default function Newsletter() {
	const [email, setEmail] = useState("")
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
	const [message, setMessage] = useState("")
	const [consent, setConsent] = useState(false)
	const { addToast } = useToast()
	const store = useStoreContext()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email || !consent) return

		setStatus("loading")
		try {
			const res = await fetch("/api/newsletter", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, consent }),
			})
			const data = await res.json()
			if (res.ok) {
				setStatus("success")
				setMessage(data.message || "Subscribed successfully!")
				addToast(data.message || "Subscribed successfully!", "success")
				setEmail("")
				setConsent(false)
			} else {
				setStatus("error")
				setMessage(data.message || "Failed to subscribe")
				addToast(data.message || "Failed to subscribe", "error")
			}
		} catch {
			setStatus("error")
			setMessage("Something went wrong. Please try again.")
			addToast("Something went wrong. Please try again.", "error")
		}
	}

	return (
		<section className="glass-card navy-glass p-6 sm:p-8 text-center">
			<h2 className="text-2xl font-bold mb-4">{store.homepage.newsletterTitle}</h2>
			<p className="text-gray-600 dark:text-gray-300 mb-6">
				{store.homepage.newsletterDescription}
			</p>

			{status === "success" ? (
				<div className="flex items-center justify-center gap-2 text-green-600">
					<CheckCircle2 size={20} />
					<span>{message}</span>
				</div>
			) : (
				<form
					onSubmit={handleSubmit}
					className="flex flex-col sm:flex-row max-w-md mx-auto gap-2"
				>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="you@example.com"
						className="flex-1 px-4 py-2 rounded-lg bg-white/20 dark:bg-black/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
						required
					/>
					<label className="flex items-start gap-2 text-left text-xs text-gray-600 dark:text-gray-300 sm:col-span-2">
						<input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" required />
						<span>I agree to receive occasional store news and offers. I can unsubscribe at any time.</span>
					</label>
					<button
						type="submit"
						disabled={status === "loading"}
						className="btn-primary w-full sm:w-auto disabled:opacity-50"
					>
						{status === "loading" ? "Subscribing..." : "Subscribe"}
					</button>
			</form>
			)}
			<p className="mt-4 text-xs text-gray-500"><Link href="/newsletter/unsubscribe" className="hover:text-primary hover:underline">Unsubscribe from store news</Link></p>

			{status === "error" && (
				<p className="text-red-500 text-sm mt-3">{message}</p>
			)}
		</section>
	)
}
