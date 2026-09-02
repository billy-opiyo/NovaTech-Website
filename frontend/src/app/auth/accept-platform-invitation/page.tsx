"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { CheckCircle2, ShieldCheck } from "lucide-react"
import AuthCloseButton from "@/components/auth/AuthCloseButton"

type Preview = { email: string; role: string; expiresAt: string }

function humanizeRole(role: string) {
	return role.replace("PLATFORM_", "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function AcceptPlatformInvitationForm() {
	const params = useSearchParams()
	const router = useRouter()
	const token = params.get("token") || ""
	const callbackUrl = `/auth/accept-platform-invitation?token=${encodeURIComponent(token)}`
	const { data: session, status, update } = useSession()
	const [preview, setPreview] = useState<Preview | null>(null)
	const [message, setMessage] = useState("Loading platform invitation…")
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		if (!token) { setMessage("This platform invitation link is invalid."); return }
		fetch(`/api/platform/access/accept?token=${encodeURIComponent(token)}`, { cache: "no-store" })
			.then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "Platform invitation unavailable"); return data.invitation })
			.then((invitation) => { setPreview(invitation); setMessage("") })
			.catch((error) => setMessage(error instanceof Error ? error.message : "Platform invitation unavailable"))
	}, [token])

	async function accept() {
		setBusy(true); setMessage("")
		const response = await fetch("/api/platform/access/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) { setMessage(data.message || "Unable to accept platform invitation"); setBusy(false); return }
		await update()
		router.replace(data.redirectTo || "/platform")
	}

	return <div className="mx-auto flex min-h-[65vh] max-w-md items-center py-12"><div className="glass-card relative w-full p-8"><AuthCloseButton fallback="/" /><div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldCheck size={28} /></div><h1 className="text-2xl font-bold">Platform access invitation</h1><p className="mt-2 text-sm text-gray-500">This invitation grants controlled access to Nurava Tech platform tools.</p></div>{preview ? <><div className="space-y-3 rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-700"><p><span className="text-gray-500">Invited email:</span> <strong>{preview.email}</strong></p><p><span className="text-gray-500">Platform role:</span> <strong>{humanizeRole(preview.role)}</strong></p><p><span className="text-gray-500">Expires:</span> <strong>{new Date(preview.expiresAt).toLocaleDateString()}</strong></p></div>{status === "authenticated" && session?.user?.email?.toLowerCase() === preview.email.toLowerCase() ? <button onClick={() => void accept()} disabled={busy} className="btn-primary mt-7 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50">{busy ? "Granting access…" : <><CheckCircle2 size={18} /> Accept platform access</>}</button> : <><p className="mt-5 text-sm text-amber-700">Sign in with the invited email address to accept this invitation.</p><Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-primary mt-4 block text-center">Sign in to accept</Link><Link href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="mt-3 block text-center text-sm text-primary hover:underline">Create an account with this email</Link></>}</> : <p className="text-center text-red-600">{message}</p>}{message && preview && <p className="mt-4 text-sm text-red-600">{message}</p>}</div></div>
}

export default function AcceptPlatformInvitationPage() { return <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading…</div>}><AcceptPlatformInvitationForm /></Suspense> }
