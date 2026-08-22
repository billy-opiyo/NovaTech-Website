"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AuthCloseButton from "@/components/auth/AuthCloseButton"

type Preview = { email: string; role: string; expiresAt: string; storeName: string }

function AcceptInvitationForm() {
	const params = useSearchParams()
	const router = useRouter()
	const token = params.get("token") || ""
	const callbackUrl = `/auth/accept-invitation?token=${encodeURIComponent(token)}`
	const [preview, setPreview] = useState<Preview | null>(null)
	const [message, setMessage] = useState("Loading invitation…")
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		if (!token) { setMessage("This invitation link is invalid."); return }
		fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`, { cache: "no-store" })
			.then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "Invitation unavailable"); return data.invitation })
			.then((invitation) => { setPreview(invitation); setMessage("") })
			.catch((error) => setMessage(error.message || "Invitation unavailable"))
	}, [token])

	async function accept() {
		setBusy(true); setMessage("")
		const response = await fetch("/api/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
		const data = await response.json().catch(() => ({}))
		if (response.ok) router.push(data.redirectTo || "/manage")
		else { setMessage(data.message || "Unable to accept invitation"); setBusy(false) }
	}

	return <div className="mx-auto flex min-h-[65vh] max-w-md items-center py-12"><div className="glass-card relative w-full p-8"><AuthCloseButton fallback="/" />{preview ? <><h1 className="text-2xl font-bold">Join {preview.storeName}</h1><p className="mt-3 text-gray-500">You were invited as <strong>{preview.role.replace("STORE_", "").replaceAll("_", " ")}</strong>.</p><p className="mt-2 text-sm text-gray-500">Invitation for {preview.email}. Expires {new Date(preview.expiresAt).toLocaleDateString()}.</p><button onClick={accept} disabled={busy} className="btn-primary mt-7 w-full disabled:opacity-50">{busy ? "Accepting…" : "Accept invitation"}</button><p className="mt-5 text-center text-sm text-gray-500">Already have an account? <Link className="text-primary hover:underline" href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Sign in first</Link></p><p className="mt-2 text-center text-sm text-gray-500">New to Nurava Tech? <Link className="text-primary hover:underline" href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Create an account</Link></p></> : <p className="text-center text-red-600">{message}</p>}{message && preview && <p className="mt-4 text-sm text-red-600">{message}</p>}</div></div>
}

export default function AcceptInvitationPage() { return <Suspense fallback={<div className="py-20 text-center">Loading…</div>}><AcceptInvitationForm /></Suspense> }
