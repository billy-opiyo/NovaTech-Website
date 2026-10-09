"use client"

import { useEffect, useRef, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { X } from "lucide-react"

const DISMISS_KEY = "nurava.android-app-download.dismissed"
const SESSION_SHOWN_KEY = "nurava.android-app-download.shown-this-session"
const APP_DOWNLOAD_URL = "/downloads/nurava-hubstores-staging.apk"

export default function AppDownloadPrompt({ showOnPlatformHomepage }: { showOnPlatformHomepage: boolean }) {
	const [visible, setVisible] = useState(false)
	const shownThisMount = useRef(false)

	useEffect(() => {
		if (!showOnPlatformHomepage || Capacitor.isNativePlatform()) {
			setVisible(false)
			return
		}
		if (shownThisMount.current) {
			setVisible(false)
			return
		}
		shownThisMount.current = true

		try {
			if (
				window.localStorage.getItem(DISMISS_KEY) === "true" ||
				window.sessionStorage.getItem(SESSION_SHOWN_KEY) === "true"
			) {
				setVisible(false)
				return
			}

			window.sessionStorage.setItem(SESSION_SHOWN_KEY, "true")
			setVisible(true)
		} catch {
			setVisible(true)
		}
	}, [showOnPlatformHomepage])

	const dismissPermanently = (checked: boolean) => {
		if (!checked) return

		try {
			window.localStorage.setItem(DISMISS_KEY, "true")
		} catch {
			// The checkbox still dismisses the prompt for this page view.
		}
		setVisible(false)
	}

	if (!visible) return null

	return (
		<aside
			aria-label="Download the Nurava HubStores Android app"
			className="glass-card navy-glass fixed inset-x-3 bottom-[calc(5.5rem_+_env(safe-area-inset-bottom))] z-[45] mx-auto max-w-md sm:inset-x-auto sm:right-5 sm:bottom-5 sm:left-auto sm:w-[min(26rem,calc(100vw_-_2.5rem))]"
		>
			<div className="flex items-center gap-2">
				<a
					href={APP_DOWNLOAD_URL}
					download="Nurava-HubStores-Android-Staging.apk"
					className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
				>
					Download Mobile App
				</a>
				<button
					type="button"
					aria-label="Close app download prompt"
					onClick={() => setVisible(false)}
					className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-theme-border text-theme-muted transition hover:bg-theme-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>
			<label className="mt-3 flex cursor-pointer items-center justify-center gap-2 text-sm text-theme-muted">
				<input
					type="checkbox"
					className="h-4 w-4 accent-primary"
					onChange={(event) => dismissPermanently(event.currentTarget.checked)}
				/>
				<span>Don&apos;t Show this again</span>
			</label>
		</aside>
	)
}
