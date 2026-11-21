"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useStoreContext } from "@/lib/store-context"

export default function OfflineNotice() {
	const pathname = usePathname()
	const store = useStoreContext()
	const [isOffline, setIsOffline] = useState(false)
	const [retrying, setRetrying] = useState(false)

	useEffect(() => {
		const updateConnectionStatus = () => setIsOffline(!navigator.onLine)
		updateConnectionStatus()
		window.addEventListener("offline", updateConnectionStatus)
		window.addEventListener("online", updateConnectionStatus)
		const handleOfflineNavigation = (event: MouseEvent) => {
			const target = event.target
			if (!(target instanceof Element)) return
			const anchor = target.closest("a[href]") as HTMLAnchorElement | null
			if (!anchor || anchor.hasAttribute("download") || anchor.target === "_blank") return
			try {
				const destination = new URL(anchor.href, window.location.href)
				if (destination.origin === window.location.origin && destination.pathname !== window.location.pathname) setIsOffline(!navigator.onLine)
			} catch { /* Ignore malformed links. */ }
		}
		document.addEventListener("click", handleOfflineNavigation, true)

		return () => {
			window.removeEventListener("offline", updateConnectionStatus)
			window.removeEventListener("online", updateConnectionStatus)
			document.removeEventListener("click", handleOfflineNavigation, true)
		}
	}, [])

	// An offline platform app launch can render the cached homepage and its splash.
	// Keep the dialog for all other pages and show it as soon as the user attempts
	// to navigate away while the device is still offline.
	if (!isOffline || (store.isPlatformHome && pathname === "/")) return null

	return (
		<div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="status" aria-live="assertive">
			<section className="glass-card navy-glass w-full max-w-md border-0 p-7 text-center shadow-2xl sm:p-9" aria-labelledby="offline-notice-title" aria-describedby="offline-notice-description">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
					<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M2 8.8a15 15 0 0 1 20 0" />
						<path d="M5 13a10 10 0 0 1 14 0" />
						<path d="M8.5 16.5a5 5 0 0 1 7 0" />
						<path d="M12 20h.01" />
						<path d="m3 3 18 18" />
					</svg>
				</div>
				<h1 id="offline-notice-title" className="mt-5 text-xl font-bold text-theme-text sm:text-2xl">Connection Unavailable</h1>
				<p className="mt-3 text-sm leading-6 text-theme-muted">Please check you Internet Connection.</p>
				<p id="offline-notice-description" className="mt-2 text-sm leading-6 text-theme-muted">{retrying ? "Retrying your current page…" : "Some features may be temporarily unavailable. We’ll reconnect automatically when your connection returns."}</p>
				<button
					type="button"
					disabled={retrying}
					onClick={() => {
						setRetrying(true)
						window.location.reload()
					}}
					className="btn-primary mt-6 inline-flex min-h-11 min-w-28 items-center justify-center rounded-lg px-6 py-3 font-semibold [-webkit-tap-highlight-color:transparent] disabled:cursor-wait disabled:opacity-70"
				>
					{retrying ? "Retrying…" : "Retry"}
				</button>
			</section>
		</div>
	)
}
