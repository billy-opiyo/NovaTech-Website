"use client"

import { useCallback, useEffect, useState } from "react"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { usePathname } from "next/navigation"
import { Download, LoaderCircle, X } from "lucide-react"

type UpdateManifest = {
	versionCode: number
	versionName: string
	apkUrl: string
	releaseNotes: string
}

type AppUpdaterPlugin = {
	downloadUpdate(options: { url: string; versionCode: number; versionName: string }): Promise<{ downloadId: number }>
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>("AppUpdater")
const UPDATE_MANIFEST_URL = "/downloads/nurava-hubstores-update.json"

function isUpdateManifest(value: unknown): value is UpdateManifest {
	if (!value || typeof value !== "object") return false
	const manifest = value as Record<string, unknown>
	return Number.isSafeInteger(manifest.versionCode)
		&& typeof manifest.versionName === "string"
		&& typeof manifest.apkUrl === "string"
		&& typeof manifest.releaseNotes === "string"
}

export default function AndroidAppUpdatePrompt({ showOnPlatformHomepage }: { showOnPlatformHomepage: boolean }) {
	const pathname = usePathname()
	const isPlatformHomepage = showOnPlatformHomepage && pathname === "/"
	const [update, setUpdate] = useState<UpdateManifest | null>(null)
	const [dismissedVersionCode, setDismissedVersionCode] = useState<number | null>(null)
	const [downloading, setDownloading] = useState(false)
	const [downloadStarted, setDownloadStarted] = useState(false)
	const [error, setError] = useState("")

	const checkForUpdate = useCallback(async () => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
		try {
			const [appInfo, response] = await Promise.all([
				App.getInfo(),
				fetch(`${UPDATE_MANIFEST_URL}?check=${Date.now()}`, { cache: "no-store" }),
			])
			if (!response.ok) return
			const manifest: unknown = await response.json()
			if (!isUpdateManifest(manifest) || !/^\d+$/.test(appInfo.build)) return
			const installedVersionCode = Number(appInfo.build)
			if (manifest.versionCode > installedVersionCode) {
				setUpdate(manifest)
				setError("")
			} else {
				setUpdate(null)
			}
		} catch {
			// A failed update check must not interrupt opening or using the app.
		}
	}, [])

	useEffect(() => {
		if (!isPlatformHomepage || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
		void checkForUpdate()
		let active = true
		let appStateListener: { remove: () => Promise<void> } | undefined
		const checkInterval = window.setInterval(() => void checkForUpdate(), 3 * 60 * 1000)
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") void checkForUpdate()
		}
		document.addEventListener("visibilitychange", handleVisibilityChange)
		void App.addListener("appStateChange", ({ isActive }) => {
			if (active && isActive) void checkForUpdate()
		}).then((listener) => {
			if (active) appStateListener = listener
			else void listener.remove()
		})
		return () => {
			active = false
			window.clearInterval(checkInterval)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
			if (appStateListener) void appStateListener.remove()
		}
	}, [checkForUpdate, isPlatformHomepage])

	useEffect(() => {
		setDownloadStarted(false)
		setError("")
	}, [update?.versionCode])

	const downloadUpdate = async () => {
		if (!update || downloading) return
		setDownloading(true)
		setError("")
		try {
			const url = new URL(update.apkUrl, window.location.origin).toString()
			if (new URL(url).origin !== window.location.origin) throw new Error("The update must download from the current app site.")
			if (Capacitor.isPluginAvailable("AppUpdater")) {
				await AppUpdater.downloadUpdate({ url, versionCode: update.versionCode, versionName: update.versionName })
				setDownloadStarted(true)
				setError("The download has started. Android will notify you when it is ready; tap that notification to install the update.")
			} else {
				// Existing installs cannot have the updater plugin until they update once.
				await Browser.open({ url })
				setDownloadStarted(true)
				setError("The Android browser opened the update download. When it finishes, open the downloaded APK and confirm installation.")
			}
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to start the app update download.")
		} finally {
			setDownloading(false)
		}
	}

	if (!isPlatformHomepage || !update || dismissedVersionCode === update.versionCode) return null

	return (
		<div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation">
			<section className="glass-card navy-glass relative w-full max-w-md border border-white/15 p-6 text-center shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="app-update-title" aria-describedby="app-update-description">
				<button type="button" onClick={() => setDismissedVersionCode(update.versionCode)} className="absolute right-3 top-3 rounded-full p-2 text-gray-500 transition hover:bg-black/10 hover:text-theme-text dark:hover:bg-white/10" aria-label="Remind me later"><X size={18} /></button>
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary"><Download size={25} aria-hidden="true" /></div>
				<h2 id="app-update-title" className="mt-4 text-xl font-bold sm:text-2xl">App update available</h2>
				<p id="app-update-description" className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Nurava HubStores {update.versionName} is ready. Download it here, then tap the Android download notification to install it.</p>
				{update.releaseNotes && <p className="mt-2 text-sm leading-6 text-gray-500">{update.releaseNotes}</p>}
				{error && <p className={`mt-4 text-sm leading-5 ${downloading ? "text-gray-500" : "text-primary"}`} role="status">{error}</p>}
				<div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
					<button type="button" onClick={() => setDismissedVersionCode(update.versionCode)} className="rounded-lg border border-theme-border px-4 py-3 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5">Remind me later</button>
					<button type="button" onClick={() => void downloadUpdate()} disabled={downloading || downloadStarted} className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-70">{downloading ? <><LoaderCircle size={17} className="animate-spin" /> Starting download…</> : downloadStarted ? <><Download size={17} /> Download started</> : <><Download size={17} /> Download update</>}</button>
				</div>
				<p className="mt-4 text-xs text-gray-500">Android will ask you to confirm before installing.</p>
			</section>
		</div>
	)
}
