"use client"

import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"

export const PENDING_MOBILE_GOOGLE_AUTH_KEY = "nurava.mobile-google-auth.pending"

export function getSafeLocalCallbackUrl(value: string): string | null {
	if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null

	try {
		const target = new URL(value, window.location.origin)
		if (target.origin !== window.location.origin) return null
		return `${target.pathname}${target.search}${target.hash}`
	} catch {
		return null
	}
}

export async function openNativeGoogleSignIn(callbackUrl: string): Promise<boolean> {
	if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return false

	const safeCallbackUrl = getSafeLocalCallbackUrl(callbackUrl)
	if (!safeCallbackUrl) throw new Error("Invalid sign-in return page")

	const state = crypto.randomUUID()
	window.localStorage.setItem(PENDING_MOBILE_GOOGLE_AUTH_KEY, JSON.stringify({ state, callbackUrl: safeCallbackUrl }))

	const startUrl = new URL("/auth/mobile-google-start", window.location.origin)
	startUrl.searchParams.set("state", state)
	await Browser.open({ url: startUrl.toString() })
	return true
}
