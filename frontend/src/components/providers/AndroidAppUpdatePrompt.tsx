"use client"

import { useCallback, useEffect, useState } from "react"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { App } from "@capacitor/app"
import { usePathname } from "next/navigation"
import { useStoreContext } from "@/lib/store-context"
import { Download, LoaderCircle, X } from "lucide-react"
import {
	ANDROID_UPDATE_CHANNELS,
	getAndroidUpdateManifestUrl,
	isNativeUpdateCompatible,
	resolveAndroidUpdateChannel,
	validateAndroidUpdateManifest,
	type AndroidUpdateChannel,
	type AndroidUpdateManifest,
} from "@/lib/android-update-channel"

type AppUpdaterPlugin = {
	getPendingUpdate(options: { versionCode: number; channel: AndroidUpdateChannel; signingCertificateSha256: string }): Promise<{ downloadId: number | null }>
	checkUpdateCompatibility(options: { channel: AndroidUpdateChannel; applicationId: string; versionCode: number; signingCertificateSha256: string }): Promise<{ compatible: boolean }>
	downloadUpdate(options: { url: string; channel: AndroidUpdateChannel; applicationId: string; versionCode: number; versionName: string; signingCertificateSha256: string }): Promise<{ downloadId: number }>
	getDownloadStatus(options: { downloadId: number }): Promise<{ status: "running" | "paused" | "downloaded" | "failed" }>
	openDownloadedUpdate(options: { downloadId: number }): Promise<void>
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>("AppUpdater")

export default function AndroidAppUpdatePrompt({ showOnPlatformHomepage }: { showOnPlatformHomepage: boolean }) {
	const store = useStoreContext()
	const pathname = usePathname()
	const isPlatformHomepage = showOnPlatformHomepage && pathname === "/"
	const [update, setUpdate] = useState<AndroidUpdateManifest | null>(null)
	const [dismissedVersionCode, setDismissedVersionCode] = useState<number | null>(null)
	const [downloading, setDownloading] = useState(false)
	const [downloadStarted, setDownloadStarted] = useState(false)
	const [downloadId, setDownloadId] = useState<number | null>(null)
	const [downloadStatus, setDownloadStatus] = useState<"running" | "paused" | "downloaded" | null>(null)
	const [error, setError] = useState("")
	const updateVersionCode = update?.versionCode

	const checkForUpdate = useCallback(async () => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
		const hasNativeCompatibilityCheck = Capacitor.isPluginAvailable("AppUpdater")
		if (!hasNativeCompatibilityCheck) {
			setUpdate(null)
			return
		}
		const channel = resolveAndroidUpdateChannel(window.location.origin)
		if (!channel) {
			setUpdate(null)
			return
		}
		try {
			const [appInfo, response] = await Promise.all([
				App.getInfo(),
				fetch(`${getAndroidUpdateManifestUrl(channel)}?check=${Date.now()}`, { cache: "no-store" }),
			])
			if (!response.ok || appInfo.id !== "com.nurava.hubstores" || !/^\d+$/.test(appInfo.build)) {
				setUpdate(null)
				return
			}
			const manifest: unknown = await response.json()
			const installedVersionCode = Number(appInfo.build)
			const validManifest = validateAndroidUpdateManifest(manifest, channel, installedVersionCode)
			if (!validManifest) {
				setUpdate(null)
				return
			}

			const compatibility = await AppUpdater.checkUpdateCompatibility({
				channel: validManifest.channel,
				applicationId: validManifest.applicationId,
				versionCode: validManifest.versionCode,
				signingCertificateSha256: validManifest.signingCertificateSha256,
			})
			if (!isNativeUpdateCompatible(hasNativeCompatibilityCheck, compatibility)) {
				setUpdate(null)
				return
			}
			setUpdate(validManifest)
			setError("")
		} catch {
			// An unavailable or malformed update feed must not interrupt app use.
			setUpdate(null)
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
		setDownloadId(null)
		setDownloadStatus(null)
		setError("")
		if (updateVersionCode === undefined || !Capacitor.isPluginAvailable("AppUpdater")) return
		let active = true
		const restorePendingDownload = async () => {
			try {
				if (!update) return
				const pending = await AppUpdater.getPendingUpdate({
					versionCode: update.versionCode,
					channel: update.channel,
					signingCertificateSha256: update.signingCertificateSha256,
				})
				if (!active || pending.downloadId === null) return
				const result = await AppUpdater.getDownloadStatus({ downloadId: pending.downloadId })
				if (!active) return
				if (result.status === "failed") {
					setError("The previous APK download failed or was cancelled. You can try again.")
					return
				}
				setDownloadId(pending.downloadId)
				setDownloadStarted(true)
				setDownloadStatus(result.status)
				if (result.status === "paused") setError("The APK download is paused. Resume it from the Android download notification.")
				else if (result.status === "downloaded") setError("Download complete. If Android's install screen was dismissed, tap Open installer to try again.")
				else setError("Your app update download is continuing in the background.")
			} catch {
				// A failed state recovery must not prevent the user from checking the update.
			}
		}
		void restorePendingDownload()
		return () => {
			active = false
		}
	}, [update, updateVersionCode])

	useEffect(() => {
		if (!downloadStarted || downloadId === null || downloadStatus === "downloaded" || !Capacitor.isPluginAvailable("AppUpdater")) return
		let active = true
		const checkDownload = async () => {
			try {
				const result = await AppUpdater.getDownloadStatus({ downloadId })
				if (!active) return
				if (result.status === "failed") {
					setDownloadStarted(false)
					setDownloadId(null)
					setDownloadStatus(null)
					setError("The APK download failed or was cancelled. Check your connection, then try again.")
				} else if (result.status === "paused") {
					setDownloadStatus("paused")
					setError("The APK download is paused. Resume it from the Android download notification.")
				} else if (result.status === "downloaded") {
					setDownloadStatus("downloaded")
					setError("Download complete. If Android's install screen was dismissed, tap Open installer to try again.")
				} else {
					setDownloadStatus("running")
					setError("The install screen will open automatically when the download finishes. Android will ask you to confirm the update.")
				}
			} catch {
				// A temporary status-query failure must not interrupt an active download.
			}
		}
		void checkDownload()
		const interval = window.setInterval(() => void checkDownload(), 2000)
		return () => {
			active = false
			window.clearInterval(interval)
		}
	}, [downloadId, downloadStarted, downloadStatus])

	const reopenDownloadedInstaller = async () => {
		if (downloadId === null || !Capacitor.isPluginAvailable("AppUpdater")) return
		setDownloading(true)
		setError("")
		try {
			await AppUpdater.openDownloadedUpdate({ downloadId })
			setError("Opening Android's installer. Confirm the update there to finish installing it.")
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to reopen the downloaded app installer.")
		} finally {
			setDownloading(false)
		}
	}

	const downloadUpdate = async () => {
		if (!update || downloading) return
		setDownloading(true)
		setDownloadStatus(null)
		setError("")
		try {
			const channelSettings = ANDROID_UPDATE_CHANNELS[update.channel]
			const parsedUrl = new URL(update.apkUrl, window.location.origin)
			if (parsedUrl.origin !== channelSettings.origin || parsedUrl.pathname !== channelSettings.apkPath) {
				throw new Error("The update download URL does not match this app channel.")
			}
			const url = parsedUrl.toString()
			if (!Capacitor.isPluginAvailable("AppUpdater")) {
				throw new Error("This installed app cannot verify update compatibility. Use a trusted manual installation path.")
			}
			const result = await AppUpdater.downloadUpdate({
				url,
				channel: update.channel,
				applicationId: update.applicationId,
				versionCode: update.versionCode,
				versionName: update.versionName,
				signingCertificateSha256: update.signingCertificateSha256,
			})
			setDownloadId(result.downloadId)
			setDownloadStarted(true)
			setDownloadStatus("running")
			setError("The install screen will open automatically when the download finishes. Android will ask you to confirm the update.")
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
				<p id="app-update-description" className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{store.platformBrandName} {update.versionName} is ready. The Android install screen will open after the download finishes.</p>
				{update.releaseNotes && <p className="mt-2 text-sm leading-6 text-gray-500">{update.releaseNotes}</p>}
				{error && <p className={`mt-4 text-sm leading-5 ${downloading ? "text-gray-500" : "text-primary"}`} role="status">{error}</p>}
				<div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
					<button type="button" onClick={() => setDismissedVersionCode(update.versionCode)} className="rounded-lg border border-theme-border px-4 py-3 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5">Remind me later</button>
					<button type="button" onClick={() => downloadStatus === "downloaded" ? void reopenDownloadedInstaller() : void downloadUpdate()} disabled={downloading || (downloadStarted && downloadStatus !== "downloaded")} className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-70">{downloading ? <><LoaderCircle size={17} className="animate-spin" /> {downloadStatus === "downloaded" ? "Opening installer…" : "Starting download…"}</> : downloadStatus === "downloaded" ? <><Download size={17} /> Open installer</> : downloadStarted ? <><Download size={17} /> Download started</> : <><Download size={17} /> Download update</>}</button>
				</div>
				<p className="mt-4 text-xs text-gray-500">Android requires your confirmation before it installs an app update.</p>
			</section>
		</div>
	)
}
