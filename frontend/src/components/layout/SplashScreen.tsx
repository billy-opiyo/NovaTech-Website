"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { clientConfig } from "@/config/client.config"

const SPLASH_DURATION = 5000
const POST_LOAD_DELAY = 2000
const SPLASH_IMAGES = [
	"/images/NovaTech cover mobile.png",
	"/images/NovaTech cover desktop.png",
	"/images/NovaTech cover mobile light.png",
	"/images/NovaTech cover desktop light.png",
]

export default function SplashScreen({ children, platformHome }: { children: ReactNode; platformHome: boolean }) {
	const pathname = usePathname()
	const isPlatformHomepage = platformHome && pathname === "/"
	const isSuperAdminPage = pathname === "/platform" || pathname.startsWith("/platform/")
	const shouldShowSplash = clientConfig.features.showSplashScreen && (isPlatformHomepage || isSuperAdminPage)
	const routeScope = isSuperAdminPage ? "platform-admin" : "platform-home"
	const shownScopes = useRef(new Set<string>())
	const startTimeRef = useRef<number | null>(null)
	const [progress, setProgress] = useState(0)
	const [visible, setVisible] = useState(false)
	const [readyToReveal, setReadyToReveal] = useState(false)

	useEffect(() => {
		if (!shouldShowSplash) return

		if (shownScopes.current.has(routeScope)) {
			setReadyToReveal(true)
			setVisible(false)
			return
		}

		let cancelled = false
		let finishTimer: number | undefined
		let frame = 0

		const preloadSplashImages = async () => {
			await Promise.all(
				SPLASH_IMAGES.map(
					(src) =>
						new Promise<void>((resolve) => {
							const image = new Image()
							image.onload = () => resolve()
							image.onerror = () => resolve()
							image.src = src
						}),
				),
			)
			if (cancelled) return

			shownScopes.current.add(routeScope)
			setProgress(0)
			setVisible(true)
			setReadyToReveal(false)
			startTimeRef.current = performance.now()

			const update = (now: number) => {
				const elapsed = now - (startTimeRef.current ?? now)
				const nextProgress = Math.min(
					100,
					Math.max(0, Math.round((elapsed / SPLASH_DURATION) * 100)),
				)
				setProgress(nextProgress)
				if (nextProgress < 100) frame = window.requestAnimationFrame(update)
			}

			frame = window.requestAnimationFrame(update)
			finishTimer = window.setTimeout(() => {
				setVisible(false)
				setReadyToReveal(true)
			}, SPLASH_DURATION + POST_LOAD_DELAY)
		}

		const bootSplash = () => {
			void preloadSplashImages()
		}

		if (document.readyState === "complete") {
			bootSplash()
		} else {
			window.addEventListener("load", bootSplash, { once: true })
			return () => {
				cancelled = true
				window.removeEventListener("load", bootSplash)
				window.cancelAnimationFrame(frame)
				if (finishTimer) window.clearTimeout(finishTimer)
			}
		}

		return () => {
			cancelled = true
			window.cancelAnimationFrame(frame)
			if (finishTimer) window.clearTimeout(finishTimer)
		}
	}, [routeScope, shouldShowSplash])

	useEffect(() => {
		if (!visible) return

		const html = document.documentElement
		const body = document.body
		const previousHtmlOverflow = html.style.overflow
		const previousBodyOverflow = body.style.overflow
		const previousBodyTouchAction = body.style.touchAction
		const previousHtmlOverscrollBehavior = html.style.overscrollBehavior

		html.classList.add("splash-pending")
		body.classList.add("splash-pending")
		html.style.overflow = "hidden"
		html.style.overscrollBehavior = "none"
		body.style.overflow = "hidden"
		body.style.touchAction = "none"

		return () => {
			html.classList.remove("splash-pending")
			body.classList.remove("splash-pending")
			html.style.overflow = previousHtmlOverflow
			html.style.overscrollBehavior = previousHtmlOverscrollBehavior
			body.style.overflow = previousBodyOverflow
			body.style.touchAction = previousBodyTouchAction
		}
	}, [visible])

	if (!shouldShowSplash) return <>{children}</>
	if (!readyToReveal) {
		if (!visible) return null
		return (
			<div
				className="splash-screen"
				role="status"
				aria-live="polite"
				aria-label={`Loading ${clientConfig.brand.name}`}
			>
				<div className="splash-content relative z-10 flex w-full max-w-md flex-col items-center px-8 text-center">
					<p className="splash-welcome mb-3 text-xs font-extrabold uppercase tracking-[0.35em] text-blue-700 dark:text-blue-200">
						Welcome to
					</p>
					<h1 className="splash-wordmark" aria-label={clientConfig.brand.name}>
						{Array.from(clientConfig.brand.name).map((character, index) => (
							<span
								key={`${character}-${index}`}
								style={{ animationDelay: `${index * 240}ms` }}
							>
								{character === " " ? "\u00a0" : character}
							</span>
						))}
					</h1>
					<div className="splash-loading mt-10 w-full">
						<div className="mb-3 flex items-center justify-between text-sm font-extrabold text-blue-700 dark:text-blue-200">
							<span>Preparing your store</span>
							<span className="tabular-nums">
								{progress}%
								<span className="splash-ellipsis" aria-label="Loading">
									<span>.</span>
									<span>.</span>
									<span>.</span>
								</span>
							</span>
						</div>
						<div
							className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
							aria-hidden="true"
						>
							<div
								className="splash-progress h-full rounded-full"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return <>{children}</>
}
