"use client"

import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"
import type { MouseEvent as ReactMouseEvent } from "react"

export const APP_DOWNLOAD_PATH = "/downloads/nurava-hubstores-staging.apk"
export const APP_DOWNLOAD_FILENAME = "Nurava-HubStores-Android-Staging.apk"

function getAppDownloadUrl() {
	const downloadUrl = new URL(APP_DOWNLOAD_PATH, window.location.origin)
	// Avoid a stale APK from the browser or Vercel cache when the file at this
	// stable path is replaced by a newer staging build.
	downloadUrl.searchParams.set("v", Date.now().toString())
	return downloadUrl.toString()
}

export function handleAppDownloadClick(event: ReactMouseEvent<HTMLAnchorElement>) {
	const downloadUrl = getAppDownloadUrl()
	event.currentTarget.href = downloadUrl

	if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return

	// Android WebView does not reliably honor the HTML download attribute.
	// Hand the APK to the Android browser so its download manager can notify the user.
	event.preventDefault()
	void Browser.open({ url: downloadUrl.toString() }).catch(() => {
		const externalWindow = window.open(downloadUrl.toString(), "_system")
		if (!externalWindow) window.location.assign(downloadUrl)
	})
}

/** Open the same route in the Android app, or let Android's browser fallback download its APK. */
export function handleOpenAppClick(event: ReactMouseEvent<HTMLAnchorElement>) {
	event.preventDefault()
	const downloadUrl = getAppDownloadUrl()
	const isAndroidBrowser = /Android/i.test(window.navigator.userAgent)

	if (!isAndroidBrowser) {
		window.location.assign(downloadUrl)
		return
	}

	const appUrl = new URL("com.nurava.hubstores://open")
	appUrl.searchParams.set("url", window.location.href)
	const intentUrl = `intent://open?${appUrl.searchParams.toString()}#Intent;scheme=com.nurava.hubstores;package=com.nurava.hubstores;S.browser_fallback_url=${encodeURIComponent(downloadUrl)};end`
	let fallbackTimer: number | undefined
	const clearFallbackTimer = () => {
		if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
		window.removeEventListener("pagehide", clearFallbackTimer)
		window.removeEventListener("blur", clearFallbackTimer)
	}
	window.addEventListener("pagehide", clearFallbackTimer, { once: true })
	window.addEventListener("blur", clearFallbackTimer, { once: true })
	window.location.assign(intentUrl)
	// Some Android browsers do not understand intent:// links. If the app was
	// not opened and the browser stayed visible, fall back to the APK download.
	fallbackTimer = window.setTimeout(() => {
		if (document.visibilityState === "visible") window.location.assign(downloadUrl)
		clearFallbackTimer()
	}, 1500)
}

/** Hand the current in-app route to the user's normal browser. */
export function handleOpenWebsiteClick(event: ReactMouseEvent<HTMLAnchorElement>) {
	if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
	event.preventDefault()
	void Browser.open({ url: window.location.href }).catch(() => {
		const externalWindow = window.open(window.location.href, "_system")
		if (!externalWindow) window.location.assign(window.location.href)
	})
}
