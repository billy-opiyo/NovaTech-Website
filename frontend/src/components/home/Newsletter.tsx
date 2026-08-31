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
		<section className="glass-card navy-glass px-4 py-6 text-center sm:px-6 sm:py-8">
			<h2 className="mb-3 text-2xl font-bold">{store.homepage.newsletterTitle}</h2>
			<p className="mx-auto mb-5 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
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
					className="mx-auto grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
				>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="you@example.com"
						className="h-10 min-w-0 w-full rounded-lg bg-white/20 px-3 py-2 text-sm dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary sm:px-4"
						required
					/>
					<label className="flex min-w-0 items-start gap-2 text-left text-xs leading-5 text-gray-600 dark:text-gray-300 sm:col-span-2 sm:row-start-2">
						<input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" required />
						<span>I agree to receive occasional store news and offers. I can unsubscribe at any time.</span>
					</label>
					<button
						type="submit"
						disabled={status === "loading"}
						className="btn-primary inline-flex h-10 w-full items-center justify-center whitespace-nowrap px-4 py-2 text-sm disabled:opacity-50 sm:col-start-2 sm:row-start-1 sm:w-auto"
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
