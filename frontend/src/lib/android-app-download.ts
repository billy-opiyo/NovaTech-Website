"use client"

import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"
import type { MouseEvent as ReactMouseEvent } from "react"

export const APP_DOWNLOAD_PATH = "/downloads/nurava-hubstores-staging.apk"
export const APP_DOWNLOAD_FILENAME = "Nurava-HubStores-Android-Staging.apk"

export function handleAppDownloadClick(event: ReactMouseEvent<HTMLAnchorElement>) {
	const downloadUrl = new URL(APP_DOWNLOAD_PATH, window.location.origin)
	// Avoid a stale APK from the browser or Vercel cache when the file at this
	// stable path is replaced by a newer staging build.
	downloadUrl.searchParams.set("v", Date.now().toString())
	event.currentTarget.href = downloadUrl.toString()

	if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return

	// Android WebView does not reliably honor the HTML download attribute.
	// Hand the APK to the Android browser so its download manager can notify the user.
	event.preventDefault()
	void Browser.open({ url: downloadUrl.toString() }).catch(() => {
		const externalWindow = window.open(downloadUrl.toString(), "_system")
		if (!externalWindow) window.location.assign(downloadUrl.toString())
	})
}
