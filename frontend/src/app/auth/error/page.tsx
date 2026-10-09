"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"

const errorMessages: Record<string, string> = {
	AccessDenied: "Google sign-in was cancelled or access was denied.",
	Configuration: "Google sign-in is not configured correctly for this deployment.",
	MobileAuthState: "This app sign-in request expired or could not be verified. Please try again.",
	MobileOAuthStartFailed: "Secure Google sign-in could not be started. Please try again.",
	MobileTicketExchange: "Google sign-in completed, but the app could not finish the secure handoff. Please try again.",
	OAuthAccountNotLinked: "This Google account is not linked to the existing account. Sign in with your usual method first.",
	OAuthCallbackError: "Google sign-in could not be completed. Please try again.",
	OAuthSignin: "Google sign-in could not be started. Please try again.",
}

function AuthErrorContent() {
	const searchParams = useSearchParams()
	const code = searchParams.get("error") || ""
	const message = errorMessages[code] || "Sign-in could not be completed. Please return to sign in and try again."

	return (
		<main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
			<section className="glass-card w-full max-w-md p-8 text-center">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600"><AlertCircle size={24} /></div>
				<h1 className="mt-4 text-2xl font-bold">Sign-in problem</h1>
				<p className="mt-2 text-sm text-theme-muted">{message}</p>
				<Link href="/auth/signin" className="btn-primary mt-6 inline-flex min-h-11 items-center justify-center px-5">Back to sign in</Link>
			</section>
		</main>
	)
}

export default function AuthErrorPage() {
	return <Suspense fallback={<p className="py-16 text-center text-sm text-theme-muted">Loading…</p>}><AuthErrorContent /></Suspense>
}
