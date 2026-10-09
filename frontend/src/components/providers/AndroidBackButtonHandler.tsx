"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"

/** Keep Android's system back button aligned with the shared web route history. */
export default function AndroidBackButtonHandler() {
	useEffect(() => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return

		const listener = App.addListener("backButton", ({ canGoBack }) => {
			if (canGoBack || window.history.length > 1) window.history.back()
			else void App.exitApp()
		})

		return () => {
			void listener.then((handle) => handle.remove())
		}
	}, [])

	return null
}
