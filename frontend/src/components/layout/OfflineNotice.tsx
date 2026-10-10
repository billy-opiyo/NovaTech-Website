"use client"

import { useEffect, useState } from "react"

export default function OfflineNotice() {
	const [isOffline, setIsOffline] = useState(false)

	useEffect(() => {
		const updateConnectionStatus = () => setIsOffline(!navigator.onLine)
		updateConnectionStatus()
		window.addEventListener("offline", updateConnectionStatus)
		window.addEventListener("online", updateConnectionStatus)

		return () => {
			window.removeEventListener("offline", updateConnectionStatus)
			window.removeEventListener("online", updateConnectionStatus)
		}
	}, [])

	if (!isOffline) return null

	return (
		<div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="status" aria-live="assertive">
			<section className="glass-card navy-glass w-full max-w-md border border-white/15 p-7 text-center shadow-2xl sm:p-9" aria-labelledby="offline-notice-title" aria-describedby="offline-notice-description">
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
				<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">Please check you Internet Connection.</p>
				<p id="offline-notice-description" className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Some features may be temporarily unavailable. We’ll reconnect automatically when your connection returns.</p>
			</section>
		</div>
	)
}
