"use client"

import Link from "next/link"
import { useState } from "react"
import type { FormEvent } from "react"
import { usePathname } from "next/navigation"
import { Star } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

export default function ProductReviewForm({ productId }: { productId: string }) {
	const pathname = usePathname()
	const { addToast } = useToast()
	const [rating, setRating] = useState(5)
	const [title, setTitle] = useState("")
	const [comment, setComment] = useState("")
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [requiresSignIn, setRequiresSignIn] = useState(false)
	const [submitting, setSubmitting] = useState(false)

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitting(true)
		setError("")
		setMessage("")
		setRequiresSignIn(false)

		try {
			const response = await fetch("/api/reviews", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ productId, rating, title: title.trim() || undefined, comment: comment.trim() }),
			})
			const data = await response.json().catch(() => ({}))
			if (response.status === 401) {
				setError("Please sign in before submitting a review.")
				setRequiresSignIn(true)
				addToast("Please sign in before submitting a review.", "error")
				return
			}
			if (!response.ok) throw new Error(data.message || "Unable to submit review")
			setMessage(data.message || "Your review is awaiting admin approval.")
			addToast("Review submitted and awaiting admin approval.", "success")
			setTitle("")
			setComment("")
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Unable to submit review"
			setError(message)
			addToast(message, "error")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<section className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
			<h3 className="text-lg font-semibold">Write a review</h3>
			<p className="mt-1 text-sm text-gray-500">Reviews are checked by our team before appearing publicly.</p>
			<form onSubmit={submit} className="mt-4 space-y-4">
				<div>
					<span className="block text-sm font-medium">Rating</span>
					<div className="mt-2 flex gap-1" role="radiogroup" aria-label="Product rating">
						{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setRating(value)}><Star size={22} className={value <= rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300 dark:text-gray-600"} /></button>)}
					</div>
				</div>
				<label className="block text-sm font-medium">Title <span className="font-normal text-gray-500">(optional)</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary" placeholder="Summary of your experience" /></label>
				<label className="block text-sm font-medium">Comment<textarea required minLength={10} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary" placeholder="Tell other customers about this product" /></label>
				{error && <p className="text-sm text-red-500">{error} {requiresSignIn && <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname || "/")}`} className="font-medium underline">Sign in</Link>}</p>}
				{message && <p className="text-sm text-green-600">{message}</p>}
				<button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? "Submitting…" : "Submit review"}</button>
			</form>
		</section>
	)
}
