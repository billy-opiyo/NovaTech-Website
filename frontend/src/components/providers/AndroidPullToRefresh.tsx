"use client"

import { useEffect, useRef, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { ArrowDown, LoaderCircle } from "lucide-react"

const REFRESH_THRESHOLD = 84
const MAX_PULL_DISTANCE = 120

function hasScrollableParent(target: EventTarget | null) {
	let element = target instanceof Element ? target : null
	while (element && element !== document.body && element !== document.documentElement) {
		const overflowY = window.getComputedStyle(element).overflowY
		if ((overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && element.scrollHeight > element.clientHeight + 1) {
			return true
		}
		element = element.parentElement
	}
	return false
}

export default function AndroidPullToRefresh() {
	const [pullDistance, setPullDistance] = useState(0)
	const [refreshing, setRefreshing] = useState(false)
	const refreshingRef = useRef(false)

	useEffect(() => {
		if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return

		let startX: number | null = null
		let startY: number | null = null
		let currentPull = 0
		let reloadTimer: number | undefined

		const pageIsAtTop = () => Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop) <= 1
		const resetPull = () => {
			startX = null
			startY = null
			currentPull = 0
			setPullDistance(0)
		}
		const handleTouchStart = (event: TouchEvent) => {
			if (refreshingRef.current || event.touches.length !== 1 || !pageIsAtTop() || hasScrollableParent(event.target)) return
			startX = event.touches[0].clientX
			startY = event.touches[0].clientY
		}
		const handleTouchMove = (event: TouchEvent) => {
			if (startX === null || startY === null || event.touches.length !== 1) return
			const touch = event.touches[0]
			const deltaX = touch.clientX - startX
			const deltaY = touch.clientY - startY
			if (deltaY <= 0 || Math.abs(deltaX) > deltaY) {
				resetPull()
				return
			}
			if (deltaY < 8) return

			event.preventDefault()
			currentPull = Math.min(deltaY, MAX_PULL_DISTANCE)
			setPullDistance(currentPull)
		}
		const handleTouchEnd = () => {
			startX = null
			startY = null
			if (currentPull >= REFRESH_THRESHOLD && !refreshingRef.current) {
				refreshingRef.current = true
				setRefreshing(true)
				reloadTimer = window.setTimeout(() => window.location.reload(), 180)
				return
			}
			currentPull = 0
			setPullDistance(0)
		}
		const handleTouchCancel = () => {
			if (!refreshingRef.current) resetPull()
		}

		document.addEventListener("touchstart", handleTouchStart, { passive: true })
		document.addEventListener("touchmove", handleTouchMove, { passive: false })
		document.addEventListener("touchend", handleTouchEnd, { passive: true })
		document.addEventListener("touchcancel", handleTouchCancel, { passive: true })
		return () => {
			document.removeEventListener("touchstart", handleTouchStart)
			document.removeEventListener("touchmove", handleTouchMove)
			document.removeEventListener("touchend", handleTouchEnd)
			document.removeEventListener("touchcancel", handleTouchCancel)
			if (reloadTimer !== undefined) window.clearTimeout(reloadTimer)
		}
	}, [])

	if (!pullDistance && !refreshing) return null

	const released = pullDistance >= REFRESH_THRESHOLD || refreshing
	const offset = Math.min(pullDistance * 0.65, 72)
	return (
		<div
			className="glass-card navy-glass fixed left-1/2 z-[160] flex -translate-x-1/2 items-center gap-2 rounded-full border border-theme-border px-4 py-2 text-sm font-medium shadow-xl"
			style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)", transform: `translate(-50%, ${offset}px)` }}
			role="status"
			aria-live="polite"
		>
			{refreshing ? <LoaderCircle size={17} className="animate-spin text-primary" aria-hidden="true" /> : <ArrowDown size={17} className={`text-primary transition-transform ${released ? "rotate-180" : ""}`} aria-hidden="true" />}
			<span>{refreshing ? "Reloading page…" : released ? "Release to reload" : "Pull down to reload"}</span>
		</div>
	)
}
