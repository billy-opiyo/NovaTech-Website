"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
	const [submitted, setSubmitted] = useState(false)

	return (
		<div className="mx-auto max-w-md py-12">
			<div className="glass-card p-6 sm:p-8">
				<Link href="/auth/signin" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary">
					<ArrowLeft size={16} /> Back to sign in
				</Link>
				<h1 className="mb-2 text-2xl font-bold">Reset your password</h1>
				<p className="mb-6 text-sm text-gray-500">Enter your email and we&apos;ll send reset instructions.</p>
				{submitted ? (
					<p className="rounded-lg bg-green-500/10 p-4 text-sm text-green-700">If an account exists for that email, reset instructions have been sent.</p>
				) : (
					<form onSubmit={(event) => { event.preventDefault(); setSubmitted(true) }} className="space-y-4">
						<label className="block text-sm font-medium">Email
							<span className="relative mt-2 block"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input required type="email" className="w-full rounded-lg border border-gray-200 bg-transparent py-3 pl-10 pr-3" placeholder="you@example.com" /></span>
						</label>
						<button type="submit" className="btn-primary w-full">Send reset link</button>
					</form>
				)}
			</div>
		</div>
	)
}
