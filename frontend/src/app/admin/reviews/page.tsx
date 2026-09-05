"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Star } from "lucide-react"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"

type Review = {
	id: string
	product?: { name: string } | null
	user: { name?: string | null; email: string }
	rating: number
	title?: string | null
	comment?: string | null
	moderationStatus: string
}

type ReviewData = {
	reviews: Review[]
	stats: { total?: number; pending?: number; approved?: number; flagged?: number }
}

type EditReview = {
	id: string
	rating: number
	title: string
	comment: string
}

export default function AdminReviewsPage() {
	const [status, setStatus] = useState("ALL")
	const [data, setData] = useState<ReviewData>({ reviews: [], stats: {} })
	const [error, setError] = useState("")
	const [editReview, setEditReview] = useState<EditReview | null>(null)
	const [reviewToReject, setReviewToReject] = useState<{ id: string; target: string } | null>(null)
	const [reviewToDelete, setReviewToDelete] = useState<{ id: string; target: string } | null>(null)
	const [busy, setBusy] = useState(false)
	const [busyReviewId, setBusyReviewId] = useState<string | null>(null)
	const editFormRef = useRef<HTMLFormElement>(null)
	const { addToast } = useToast()

	const load = useCallback(async () => {
		setError("")
		try {
			const response = await fetch(`/api/admin/reviews?status=${status}`, { cache: "no-store" })
			if (!response.ok) throw new Error("Unable to load reviews")
			setData(await response.json())
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to load reviews")
		}
	}, [status])

	useEffect(() => { void load() }, [load])

	useEffect(() => {
		if (!editReview) return
		requestAnimationFrame(() => editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
	}, [editReview])

	async function moderate(id: string, moderationStatus: string) {
		setBusy(true); setBusyReviewId(id)
		try {
			const response = await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, moderationStatus }) })
			if (!response.ok) throw new Error("Unable to update review")
			await load()
			addToast(`Review ${moderationStatus.toLowerCase()} successfully.`, "success")
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Unable to update review"
			setError(message)
			addToast(message, "error")
		} finally { setBusy(false); setBusyReviewId(null) }
	}

	async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!editReview) return
		setBusy(true)
		try {
			const response = await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "edit", ...editReview, title: editReview.title.trim() || null, comment: editReview.comment.trim() }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to save review")
			setEditReview(null)
			await load()
			addToast("Review correction saved and returned to pending approval.", "success")
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Unable to save review"
			setError(message)
			addToast(message, "error")
		} finally { setBusy(false) }
	}

	async function deleteReview() {
		if (!reviewToDelete) return
		setBusy(true)
		try {
			const response = await fetch("/api/admin/reviews", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: reviewToDelete.id }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to delete review")
			setReviewToDelete(null)
			await load()
			addToast("Review deleted successfully.", "success")
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Unable to delete review"
			setError(message)
			addToast(message, "error")
		} finally { setBusy(false) }
	}

	return (
		<div className="space-y-6">
			<ConfirmDialog open={Boolean(reviewToReject)} title="Reject this review?" description={reviewToReject ? `The review for ${reviewToReject.target} will be hidden from customers.` : ""} confirmLabel="Reject review" busy={busy} onCancel={() => setReviewToReject(null)} onConfirm={() => { if (!reviewToReject) return; const review = reviewToReject; setReviewToReject(null); void moderate(review.id, "REJECTED") }} />
			<ConfirmDialog open={Boolean(reviewToDelete)} title="Delete this review?" description={reviewToDelete ? `This permanently removes the review for ${reviewToDelete.target}.` : ""} confirmLabel="Delete review" busy={busy} onCancel={() => setReviewToDelete(null)} onConfirm={() => void deleteReview()} />
			<div><h1 className="text-3xl font-bold">Review moderation</h1><p className="mt-1 text-gray-500">Correct, approve, flag, reject, or delete customer reviews before publication.</p></div>
			{error && <p className="text-sm text-red-500">{error}</p>}
			{editReview && <form ref={editFormRef} onSubmit={saveEdit} className="glass-card scroll-mt-24 space-y-4 p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Edit review</h2><button type="button" onClick={() => setEditReview(null)} className="text-sm text-gray-500 underline">Cancel</button></div><div><span className="block text-sm font-medium">Rating</span><div className="mt-2 flex gap-1" role="radiogroup" aria-label="Review rating">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} role="radio" aria-checked={editReview.rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setEditReview({ ...editReview, rating: value })}><Star size={22} className={value <= editReview.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300 dark:text-gray-600"} /></button>)}</div></div><label className="block text-sm font-medium">Title <span className="font-normal text-gray-500">(optional)</span><input value={editReview.title} onChange={(event) => setEditReview({ ...editReview, title: event.target.value })} maxLength={200} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary" /></label><label className="block text-sm font-medium">Comment<textarea required minLength={10} maxLength={1000} value={editReview.comment} onChange={(event) => setEditReview({ ...editReview, comment: event.target.value })} className="mt-2 min-h-28 w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary" /></label><button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}{busy ? "Saving…" : "Save correction"}</button><p className="text-xs text-gray-500">Saving a correction returns the review to pending approval.</p></form>}
			<div className="grid gap-4 sm:grid-cols-4">{[["Total", data.stats.total], ["Pending", data.stats.pending], ["Approved", data.stats.approved], ["Flagged", data.stats.flagged]].map(([label, value]) => <div key={label as string} className="glass-card p-4"><p className="text-2xl font-bold">{value ?? "—"}</p><p className="text-sm text-gray-500">{label}</p></div>)}</div>
			<div className="flex flex-wrap gap-2">{["ALL", "PENDING", "APPROVED", "FLAGGED", "REJECTED"].map((item) => <button key={item} onClick={() => setStatus(item)} className={`rounded-lg px-3 py-2 text-xs ${status === item ? "bg-primary text-white" : "border"}`}>{item}</button>)}</div>
			<div className="glass-card overflow-x-auto"><table className="w-full min-w-[1050px]"><thead><tr className="border-b text-left text-sm text-gray-500"><th className="p-4">Product</th><th className="p-4">Customer</th><th className="p-4">Rating</th><th className="p-4">Review</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>{data.reviews.map((review) => { const target = review.product?.name || "Store homepage"; return <tr key={review.id} className="border-b align-top last:border-0"><td className="p-4">{target}{!review.product && <span className="ml-2 text-xs text-gray-500">(homepage)</span>}</td><td className="p-4"><p>{review.user.name || "—"}</p><p className="text-xs text-gray-500">{review.user.email}</p></td><td className="p-4">{review.rating}/5</td><td className="max-w-xs p-4 text-sm"><p className="font-medium">{review.title || "—"}</p><p>{review.comment || "—"}</p></td><td className="p-4 text-xs">{review.moderationStatus}</td><td className="p-4"><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => setEditReview({ id: review.id, rating: review.rating, title: review.title || "", comment: review.comment || "" })} className="rounded border px-2 py-1 text-xs">Edit</button><button type="button" disabled={busy} onClick={() => void moderate(review.id, "APPROVED")} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-green-600">{busyReviewId === review.id && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}Approve</button><button disabled={busy} onClick={() => void moderate(review.id, "FLAGGED")} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-orange-600">{busyReviewId === review.id && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}Flag</button><button type="button" disabled={busy} onClick={() => setReviewToReject({ id: review.id, target })} className="destructive-action rounded border px-2 py-1 text-xs">Reject</button><button type="button" disabled={busy} onClick={() => setReviewToDelete({ id: review.id, target })} className="destructive-action rounded border px-2 py-1 text-xs">Delete</button></div></td></tr> })}</tbody></table>{!data.reviews.length && <p className="p-10 text-center text-gray-500">No reviews in this queue.</p>}</div>
		</div>
	)
}
