"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
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
	useEffect(() => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return

		const backButtonListener = App.addListener("backButton", ({ canGoBack }) => {
			if (canGoBack || window.history.length > 1) window.history.back()
			else void App.exitApp()
		})
		const urlOpenListener = App.addListener("appUrlOpen", ({ url }) => {
			void completeMobileGoogleSignIn(url)
		})
		void App.getLaunchUrl().then((launch) => {
			if (launch?.url) void completeMobileGoogleSignIn(launch.url)
		})

		return () => {
			void backButtonListener.then((handle) => handle.remove())
			void urlOpenListener.then((handle) => handle.remove())
		}
	}, [])

	return null
}
