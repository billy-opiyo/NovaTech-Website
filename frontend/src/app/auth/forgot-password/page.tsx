"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import AuthCloseButton from "@/components/auth/AuthCloseButton"

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("")
	const [submitted, setSubmitted] = useState(false)
	const [error, setError] = useState("")
	async function submit(event: React.FormEvent) {
		event.preventDefault(); setError("")
		const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
		if (!response.ok) setError("Unable to send reset instructions")
		else setSubmitted(true)
	}
	return <div className="mx-auto max-w-md py-12"><div className="glass-card relative p-6 sm:p-8"><AuthCloseButton fallback="/auth/signin" /><Link href="/auth/signin" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500"><ArrowLeft size={16}/> Back to sign in</Link><h1 className="text-2xl font-bold">Reset your password</h1><p className="mb-6 mt-2 text-sm text-gray-500">Enter your email and we&apos;ll send reset instructions.</p>{submitted ? <p className="rounded-lg bg-green-500/10 p-4 text-sm text-green-700">If an account exists for that email, reset instructions have been sent.</p> : <form onSubmit={submit} className="space-y-4"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-3" placeholder="you@example.com"/><button className="btn-primary w-full">Send reset link</button>{error && <p className="text-sm text-red-500">{error}</p>}</form>}</div></div>
}
