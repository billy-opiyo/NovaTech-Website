"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Star } from "lucide-react"
import { useSession } from "next-auth/react"
import { useStoreContext } from "@/lib/store-context"
import { useToast } from "@/components/ui/Toast"

type StoreReview = { id: string; rating: number; title?: string | null; comment?: string | null; user?: { name?: string | null } }
type Testimonial = { id: string; name: string; role: string; text: string; rating?: number }

export default function Testimonials() {
	const store = useStoreContext()
	const { addToast } = useToast()
	const pathname = usePathname()
	const { data: session, status: sessionStatus } = useSession()
	const [reviews, setReviews] = useState<StoreReview[]>([])
	const [rating, setRating] = useState(5)
	const [title, setTitle] = useState("")
	const [comment, setComment] = useState("")
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		fetch("/api/reviews", { cache: "no-store" })
			.then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load reviews")))
			.then((data) => setReviews(Array.isArray(data.reviews) ? data.reviews : []))
			.catch(() => setReviews([]))
	}, [])

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitting(true)
		setMessage("")
		setError("")
		try {
			const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, title: title.trim() || undefined, comment: comment.trim() }) })
			const data = await response.json().catch(() => ({}))
			if (response.status === 401) { setError("Please sign in before submitting a review."); addToast("Please sign in before submitting a review.", "error"); return }
			if (!response.ok) throw new Error(data.message || "Unable to submit review")
			setMessage("Thank you. Your review is awaiting store approval.")
			addToast("Review submitted and awaiting store approval.", "success")
			setTitle("")
			setComment("")
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Unable to submit review"
			setError(message)
			addToast(message, "error")
		} finally { setSubmitting(false) }
	}

	const staticTestimonials: Testimonial[] = store.homepage.testimonials.map((testimonial, index) => ({ id: `static-${index}`, ...testimonial }))
	const approvedReviews: Testimonial[] = reviews.map((review) => ({ id: review.id, name: review.user?.name || "Customer", role: "Customer", text: review.comment || review.title || "", rating: review.rating }))

	return (
		<section>
			<h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">What Our Customers Say</h2>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				{[...staticTestimonials, ...approvedReviews].map((testimonial, index) => (
					<motion.div key={testimonial.id} initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass-card p-6">
						{testimonial.rating && <div className="mb-3 flex gap-1" aria-label={`${testimonial.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={15} className={value <= testimonial.rating! ? "fill-yellow-500 text-yellow-500" : "text-gray-300"} />)}</div>}
						<p className="mb-4 italic text-gray-600 dark:text-gray-300">&quot;{testimonial.text}&quot;</p>
						<div><p className="font-semibold">{testimonial.name}</p><p className="text-sm text-gray-500">{testimonial.role}</p></div>
					</motion.div>
				))}
			</div>

			<div className="glass-card mt-8 p-6">
				<h3 className="text-xl font-semibold">Share your experience</h3>
				<p className="mt-1 text-sm text-gray-500">Your review will appear here after the store approves it.</p>
				{sessionStatus === "authenticated" && session?.user ? <form onSubmit={submit} className="mt-4 space-y-4">
					<div><span className="block text-sm font-medium">Rating</span><div className="mt-2 flex gap-1" role="radiogroup" aria-label="Store rating">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setRating(value)}><Star size={22} className={value <= rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300 dark:text-gray-600"} /></button>)}</div></div>
					<label className="block text-sm font-medium">Title <span className="font-normal text-gray-500">(optional)</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary" placeholder="Summary of your experience" /></label>
					<label className="block text-sm font-medium">Review<textarea required minLength={10} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary" placeholder="Tell other customers about your experience" /></label>
					{error && <p className="text-sm text-red-500">{error}</p>}{message && <p className="text-sm text-green-600">{message}</p>}
					<button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? "Submitting…" : "Submit review"}</button>
				</form> : <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Please <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname || "/")}`} className="font-medium text-primary underline">sign in</Link> to submit a review.</p>}
			</div>
		</section>
	)
}
