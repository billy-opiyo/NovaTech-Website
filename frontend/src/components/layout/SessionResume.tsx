"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

const STORAGE_KEY = "novatech-last-location"
const MAX_AGE = 30 * 24 * 60 * 60 * 1000

type SavedLocation = {
	path: string
	scrollY: number
	savedAt: number
}

function routePath(path: string) {
	return path.split(/[?#]/, 1)[0]
}

function isRestorablePath(path: string) {
	const pathname = routePath(path)
	return pathname.startsWith("/") &&
		!pathname.startsWith("//") &&
		!pathname.startsWith("/admin") &&
		!pathname.startsWith("/auth") &&
		!pathname.startsWith("/api") &&
		pathname !== "/checkout"
}

function currentLocation() {
	return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function isExplicitPlatformHome(path: string) {
	try {
		return new URL(path, window.location.origin).searchParams.get("platformHome") === "1"
	} catch {
		return false
	}
}

function readSavedLocation(): SavedLocation | null {
	try {
		const value = localStorage.getItem(STORAGE_KEY)
		if (!value) return null

		const saved = JSON.parse(value) as Partial<SavedLocation>
		if (
			typeof saved.path !== "string" ||
			typeof saved.scrollY !== "number" ||
			typeof saved.savedAt !== "number" ||
			!isRestorablePath(saved.path) ||
			Date.now() - saved.savedAt > MAX_AGE
		) {
			localStorage.removeItem(STORAGE_KEY)
			return null
		}

		return { path: saved.path, scrollY: Math.max(0, saved.scrollY), savedAt: saved.savedAt }
	} catch {
		return null
	}
}

function restoreScroll(scrollY: number) {
	let attempts = 0
	let frame = 0

	const restore = () => {
		const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
		const target = Math.min(scrollY, maxScroll)
		window.scrollTo({ top: target, behavior: "auto" })
		attempts += 1

		if (target < scrollY && attempts < 120) {
			frame = window.requestAnimationFrame(restore)
		}
	}

	frame = window.requestAnimationFrame(restore)
	return () => window.cancelAnimationFrame(frame)
}

export default function SessionResume() {
	const pathname = usePathname()
	const router = useRouter()
	const initialCheckDone = useRef(false)
	const pendingRestore = useRef<SavedLocation | null>(null)
	const storageReady = useRef(false)

	useEffect(() => {
		if (!initialCheckDone.current) {
			initialCheckDone.current = true
			if (!isRestorablePath(pathname)) {
				storageReady.current = true
				return
			}

			const location = currentLocation()
			if (isExplicitPlatformHome(location)) {
				window.history.replaceState(window.history.state, "", "/")
				storageReady.current = true
				return
			}
			const saved = readSavedLocation()

			if (pathname === "/" && saved && saved.path !== location) {
				pendingRestore.current = saved
				router.replace(saved.path)
				return
			}

			storageReady.current = true
			if (saved?.path === location) restoreScroll(saved.scrollY)
			return
		}

		if (!isRestorablePath(pathname)) return
		const location = currentLocation()
		if (pendingRestore.current?.path === location) {
			const saved = pendingRestore.current
			pendingRestore.current = null
			storageReady.current = true
			restoreScroll(saved.scrollY)
		}
	}, [pathname, router])

	useEffect(() => {
		const previousScrollRestoration = window.history.scrollRestoration
		window.history.scrollRestoration = "manual"
		let frame = 0

		const save = () => {
			if (!storageReady.current) return
			const path = currentLocation()
			if (!isRestorablePath(path)) return

			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify({
					path,
					scrollY: Math.max(0, Math.round(window.scrollY)),
					savedAt: Date.now(),
				}))
			} catch {
				// Storage can be unavailable in private browsing or restricted contexts.
			}
		}

		const onScroll = () => {
			if (frame) return
			frame = window.requestAnimationFrame(() => {
				frame = 0
				save()
			})
		}
		const onVisibilityChange = () => {
			if (document.visibilityState === "hidden") save()
		}

		window.addEventListener("scroll", onScroll, { passive: true })
		window.addEventListener("pagehide", save)
		document.addEventListener("visibilitychange", onVisibilityChange)

		return () => {
			window.removeEventListener("scroll", onScroll)
			window.removeEventListener("pagehide", save)
			document.removeEventListener("visibilitychange", onVisibilityChange)
			if (frame) window.cancelAnimationFrame(frame)
			window.history.scrollRestoration = previousScrollRestoration
		}
	}, [])

	return null
}
