"use client"

import { useEffect, useState } from "react"

type Verification = { verificationStatus: string; verificationSubmittedAt: string | null; verificationReviewedAt: string | null; verificationNotes: string | null }

function humanize(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }

export default function MerchantVerificationPage() {
	const [verification, setVerification] = useState<Verification | null>(null)
	const [message, setMessage] = useState("Loading verification status…")
	const [busy, setBusy] = useState(false)

	async function load() {
		const response = await fetch("/api/manage/verification", { cache: "no-store" })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(data.message || "Verification status unavailable")
		setVerification(data.verification)
		setMessage("")
	}

	useEffect(() => { load().catch((error) => setMessage(error.message)) }, [])

	async function submit() {
		setBusy(true)
		setMessage("")
		try {
			const response = await fetch("/api/manage/verification", { method: "POST" })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to submit verification")
			setMessage(data.message || "Verification submitted")
			await load()
		} catch (error: any) {
			setMessage(error.message || "Unable to submit verification")
		} finally {
			setBusy(false)
		}
	}

	if (message && !verification) return <div className="glass-card p-6"><p>{message}</p></div>
	if (!verification) return null
	const approved = verification.verificationStatus === "APPROVED"
	const pending = verification.verificationStatus === "PENDING_REVIEW"
	return <div className="space-y-6">
		<div><h1 className="text-3xl font-bold">Merchant verification</h1><p className="mt-1 text-gray-500">Verification is required before your store can be published or sell.</p></div>
		{message && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
		<section className="glass-card max-w-3xl p-6">
			<div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-gray-500">Current status</p><h2 className="mt-1 text-2xl font-semibold">{humanize(verification.verificationStatus)}</h2></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">{approved ? "Approved" : pending ? "Awaiting review" : "Action required"}</span></div>
			<p className="mt-5 text-sm text-gray-600">Nurava will review the merchant identity, business status, location, verified contacts, tax status, and merchant-owned M-Pesa settlement details before approval. Do not paste identity documents, KRA PINs, or payment credentials into chat.</p>
			{verification.verificationNotes && <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">Reviewer note: {verification.verificationNotes}</p>}
			{!approved && <button type="button" disabled={busy || pending} onClick={() => void submit()} className="btn-primary mt-6 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Submitting…" : pending ? "Awaiting review" : "Submit for review"}</button>}
		</section>
	</div>
}
