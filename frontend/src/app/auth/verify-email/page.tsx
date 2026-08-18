"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import { CheckCircle2, Mail, RefreshCw } from "lucide-react"
import AuthCloseButton from "@/components/auth/AuthCloseButton"

function VerifyEmailForm() {
	const params = useSearchParams()
	const router = useRouter()
	const [email, setEmail] = useState(params.get("email") || "")
	const [code, setCode] = useState("")
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function submit(event: React.FormEvent) {
		event.preventDefault(); setLoading(true); setError(""); setMessage("")
		const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) })
		const result = await response.json()
		if (!response.ok) setError(result.message)
		else { setMessage(result.message); window.setTimeout(() => router.push("/auth/signin?verified=true"), 900) }
		setLoading(false)
	}

	async function resend() {
		setError(""); setMessage("")
		const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
		const result = await response.json(); setMessage(result.message)
	}

	return <div className="mx-auto flex min-h-[65vh] max-w-md items-center py-12"><div className="glass-card relative w-full p-8"><AuthCloseButton fallback="/auth/signin" /><div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Mail size={26} /></div><h1 className="text-2xl font-bold">Verify your email</h1><p className="mt-2 text-sm text-gray-500">Enter the six-digit code we sent to finish setting up your account.</p></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-primary" /></label><label className="block text-sm font-medium">Verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary" /></label>{error && <p className="text-sm text-red-500">{error}</p>}{message && <p className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 size={16} />{message}</p>}<button disabled={loading} className="btn-primary w-full disabled:opacity-50">{loading ? "Checking…" : "Verify email"}</button></form><button onClick={resend} className="mt-5 flex w-full items-center justify-center gap-2 text-sm text-primary hover:underline"><RefreshCw size={15} /> Resend code</button><Link href="/auth/signin" className="mt-5 block text-center text-sm text-gray-500 hover:text-primary">Back to sign in</Link></div></div>
}

export default function VerifyEmailPage() {
	return <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading…</div>}><VerifyEmailForm /></Suspense>
}
