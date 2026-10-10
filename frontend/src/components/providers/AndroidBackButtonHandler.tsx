"use client"

import { useEffect, useRef, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { X } from "lucide-react"
import { signIn } from "next-auth/react"
import { getSafeLocalCallbackUrl, PENDING_MOBILE_GOOGLE_AUTH_KEY } from "@/lib/mobile-google-auth"

type PendingMobileAuth = { state: string; callbackUrl: string }

const handledTickets = new Set<string>()

async function completeMobileGoogleSignIn(url: string) {
	try {
		const deepLink = new URL(url)
		if (deepLink.protocol !== "com.nurava.hubstores:" || deepLink.hostname !== "auth" || deepLink.pathname !== "/callback") return

		const ticket = deepLink.searchParams.get("ticket") || ""
		const state = deepLink.searchParams.get("state") || ""
		if (!/^[A-Za-z0-9_-]{40,64}$/.test(ticket) || handledTickets.has(ticket)) return

		const rawPending = window.localStorage.getItem(PENDING_MOBILE_GOOGLE_AUTH_KEY)
		if (!rawPending) return
		const pending = JSON.parse(rawPending) as Partial<PendingMobileAuth>
		const callbackUrl = typeof pending.callbackUrl === "string" ? getSafeLocalCallbackUrl(pending.callbackUrl) : null
		if (!callbackUrl || pending.state !== state) return

		handledTickets.add(ticket)
		await Browser.close().catch(() => undefined)
		const result = await signIn("mobile-ticket", { ticket, redirect: false, callbackUrl })
		if (result?.error) throw new Error("Mobile ticket exchange failed")

		window.localStorage.removeItem(PENDING_MOBILE_GOOGLE_AUTH_KEY)
		window.location.replace(callbackUrl)
	} catch {
		window.location.replace("/auth/error?error=MobileTicketExchange")
	}
}

/** Keep Android's system back button aligned with the shared web route history. */
export default function AndroidBackButtonHandler() {
	const [showExitDialog, setShowExitDialog] = useState(false)
	const exitDialogOpen = useRef(false)

	useEffect(() => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return

		const backButtonListener = App.addListener("backButton", ({ canGoBack }) => {
			if (exitDialogOpen.current) {
				exitDialogOpen.current = false
				setShowExitDialog(false)
				return
			}

			if (canGoBack || window.history.length > 1) window.history.back()
			else {
				exitDialogOpen.current = true
				setShowExitDialog(true)
			}
		})
		const handleAppUrl = (url: string) => {
			try {
				const deepLink = new URL(url)
				if (deepLink.protocol === "com.nurava.hubstores:" && deepLink.hostname === "open") {
					const targetUrl = deepLink.searchParams.get("url")
					if (!targetUrl) return

					const target = new URL(targetUrl)
					if (target.protocol !== "https:" || target.origin !== window.location.origin) return
					window.location.replace(target.toString())
					return
				}
			} catch {
				return
			}
			void completeMobileGoogleSignIn(url)
		}
		const urlOpenListener = App.addListener("appUrlOpen", ({ url }) => handleAppUrl(url))
		void App.getLaunchUrl().then((launch) => {
			if (launch?.url) handleAppUrl(launch.url)
		})

		return () => {
			void backButtonListener.then((handle) => handle.remove())
			void urlOpenListener.then((handle) => handle.remove())
		}
	}, [])

	if (!showExitDialog) return null

	const closeExitDialog = () => {
		exitDialogOpen.current = false
		setShowExitDialog(false)
	}

	return (
		<div className="fixed inset-0 z-[180] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="presentation">
			<section
				aria-labelledby="android-exit-dialog-title"
				aria-modal="true"
				className="glass-card relative w-full max-w-sm p-6 text-theme-text shadow-2xl"
				role="dialog"
			>
				<button
					aria-label="Close exit dialog"
					className="absolute right-3 top-3 rounded-lg p-2 text-theme-muted transition hover:bg-theme-surface/60 hover:text-theme-text"
					onClick={closeExitDialog}
					type="button"
				>
					<X aria-hidden="true" size={18} />
				</button>
				<h2 className="pr-10 text-xl font-bold" id="android-exit-dialog-title">Exit Nurava HubStores?</h2>
				<p className="mt-3 text-sm text-theme-muted">Are you sure you want to close the app?</p>
				<div className="mt-7 flex justify-between gap-3">
					<button className="min-h-11 flex-1 rounded-xl border border-theme-border px-4 font-semibold transition hover:bg-theme-surface/60" onClick={closeExitDialog} type="button">
						Cancel
					</button>
					<button className="btn-primary min-h-11 flex-1" onClick={() => void App.exitApp()} type="button">
						Exit
					</button>
				</div>
			</section>
		</div>
	)
}
