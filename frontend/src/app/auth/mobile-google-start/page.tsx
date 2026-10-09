"use client"

import { Suspense, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

function MobileGoogleStart() {
	const searchParams = useSearchParams()
	const state = searchParams.get("state") || ""
	const started = useRef(false)

	useEffect(() => {
		if (started.current) return
		started.current = true
		if (!/^[0-9a-f-]{36}$/i.test(state)) {
			window.location.replace("/auth/error?error=MobileAuthState")
			return
		}

		const callbackUrl = new URL("/api/auth/mobile-google/complete", window.location.origin)
		callbackUrl.searchParams.set("state", state)
		void signIn("google", { callbackUrl: callbackUrl.toString() }).catch(() => {
			window.location.replace("/auth/error?error=MobileOAuthStartFailed")
		})
	}, [state])

	return (
		<main className="flex min-h-[70vh] items-center justify-center px-4">
			<div className="glass-card w-full max-w-md p-8 text-center">
				<h1 className="text-xl font-semibold">Continue with Google</h1>
				<p className="mt-2 text-sm text-theme-muted">Secure sign-in is opening in your browser. Return to Nurava HubStores when Google finishes.</p>
			</div>
		</main>
	)
}

export default function MobileGoogleStartPage() {
	return <Suspense fallback={<p className="py-16 text-center text-sm text-theme-muted">Opening secure sign-in…</p>}><MobileGoogleStart /></Suspense>
}
