"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
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
	const searchParams = useSearchParams()
	// The splash belongs to the platform homepage's document load only. Keep the
	// initial pathname stable so navigating to `/` in the client does not replay
	// it; a real refresh/reload creates a new component instance and shows it.
	const initialPathname = useRef(pathname)
	const isInitialPlatformHomepage =
		platformHome && initialPathname.current === "/" && pathname === "/"
	// Authentication callbacks can perform a full document navigation back to
	// the platform homepage (especially OAuth). The user is already returning
	// to the page they started from, so do not replay the platform splash.
	const isLoginReturn = searchParams.get("login") === "success"
	const shouldShowSplash = clientConfig.features.showSplashScreen && isInitialPlatformHomepage && !isLoginReturn
	const hasShownSplash = useRef(false)
	const startTimeRef = useRef<number | null>(null)
	const [progress, setProgress] = useState(0)
	// Render the splash on the first server paint. Keeping this true initially
	// prevents the theme background from flashing before the client hydrates.
	const [visible, setVisible] = useState(true)
	const [readyToReveal, setReadyToReveal] = useState(false)

	useEffect(() => {
		if (!shouldShowSplash) return

		if (hasShownSplash.current) {
			setReadyToReveal(true)
			setVisible(false)
			return
		}

		let cancelled = false
		let finishTimer: number | undefined
		let frame = 0

		const warmActiveSplashImage = () => {
			const isLight = !document.documentElement.classList.contains("dark")
			const isDesktop = window.matchMedia("(min-width: 1200px)").matches
			const imageIndex = isLight ? (isDesktop ? 3 : 2) : isDesktop ? 1 : 0
			const image = new Image()
			image.decoding = "async"
			image.src = SPLASH_IMAGES[imageIndex]
		}

		const startSplash = () => {
			if (cancelled) return
			hasShownSplash.current = true
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

		// Start the visual immediately. The browser will continue loading the
		// active artwork without holding the splash behind a blank background.
		warmActiveSplashImage()
		startSplash()

		return () => {
			cancelled = true
			window.cancelAnimationFrame(frame)
			if (finishTimer) window.clearTimeout(finishTimer)
		}
	}, [shouldShowSplash])

	useEffect(() => {
		// `visible` starts true so the initial platform document can render the
		// splash immediately. It must never lock scrolling on merchant routes,
		// auth pages, or after a login return where no splash is shown.
		if (!shouldShowSplash || !visible) return

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
	}, [shouldShowSplash, visible])

	if (!shouldShowSplash) return <>{children}</>
	if (!readyToReveal) {
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
