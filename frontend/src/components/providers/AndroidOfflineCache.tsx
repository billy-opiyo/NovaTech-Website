"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { useStoreContext } from "@/lib/store-context"

export default function AndroidOfflineCache() {
	const store = useStoreContext()
	useEffect(() => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android" || !("serviceWorker" in navigator)) return
		void navigator.serviceWorker.register("/offline-app-sw.js", { scope: "/" })
			.then(() => navigator.serviceWorker.ready)
			.then((registration) => {
				const assetUrls = performance.getEntriesByType("resource").map((entry) => entry.name).slice(-100)
				const settings = store.platformSettings
				const configuredImages = [settings?.brand?.logo, settings?.hero?.image, settings?.splash?.logo, ...Object.values(settings?.splash?.images || {})]
				registration.active?.postMessage({ type: "cache-platform-home", assetUrls, configuredImages })
			})
			.catch((error: unknown) => console.warn("Android offline homepage cache could not be registered", error))
	}, [store.platformSettings])

	return null
}
