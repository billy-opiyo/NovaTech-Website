"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

export default function Newsletter() {
	const [email, setEmail] = useState("")
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
	const [message, setMessage] = useState("")
	const { addToast } = useToast()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email) return

		setStatus("loading")
		try {
			const res = await fetch("/api/newsletter", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			})
			const data = await res.json()
			if (res.ok) {
				setStatus("success")
				setMessage(data.message || "Subscribed successfully!")
				addToast(data.message || "Subscribed successfully!", "success")
				setEmail("")
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
		<section className="glass-card p-6 sm:p-8 text-center">
			<h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
			<p className="text-gray-600 dark:text-gray-300 mb-6">
				Get exclusive deals and new arrivals straight to your inbox.
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
					<button
						type="submit"
						disabled={status === "loading"}
						className="btn-primary w-full sm:w-auto disabled:opacity-50"
					>
						{status === "loading" ? "Subscribing..." : "Subscribe"}
					</button>
				</form>
			)}

			{status === "error" && (
				<p className="text-red-500 text-sm mt-3">{message}</p>
			)}
		</section>
	)
}
