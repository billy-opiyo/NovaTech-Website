"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Suspense } from "react"
import AuthCloseButton from "@/components/auth/AuthCloseButton"

function ResetPasswordForm() {
	const params = useSearchParams(); const router = useRouter(); const token = params.get("token") || ""
	const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [done, setDone] = useState(false)
	async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }); const result = await response.json(); if (!response.ok) setError(result.message); else { setDone(true); setTimeout(() => router.push("/auth/signin"), 1200) } }
	return <div className="mx-auto max-w-md py-12"><div className="glass-card relative p-8"><AuthCloseButton fallback="/auth/signin" /><h1 className="text-2xl font-bold">Choose a new password</h1>{done ? <p className="mt-4 text-green-600">Password updated. Redirecting to sign in…</p> : <form onSubmit={submit} className="mt-6 space-y-4"><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border px-3 py-3" placeholder="At least 8 characters"/><button className="btn-primary w-full">Update password</button>{error && <p className="text-sm text-red-500">{error}</p>}</form>}<Link href="/auth/signin" className="mt-6 inline-block text-sm text-primary">Back to sign in</Link></div></div>
}

export default function ResetPasswordPage() {
	return <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading…</div>}><ResetPasswordForm /></Suspense>
}
