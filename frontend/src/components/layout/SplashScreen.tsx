"use client"

import type { CSSProperties, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { clientConfig } from "@/config/client.config"
import { useStoreContext } from "@/lib/store-context"

const SPLASH_DURATION = 5000
const POST_LOAD_DELAY = 2000
export default function SplashScreen({ children, platformHome }: { children: ReactNode; platformHome: boolean }) {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const store = useStoreContext()
	const splashSettings = platformHome ? store.platformSettings?.splash : undefined
	const splashName = store.platformSettings?.brand?.name || clientConfig.brand.name
	const fallbackSplashLogo = "/images/Nurava_HubStores_app_icon_logo.png"
	const splashLogo = splashSettings?.logo || fallbackSplashLogo
	const showProgress = splashSettings?.showProgress !== false
	const splashDuration = showProgress ? SPLASH_DURATION : Math.max(450, (Array.from(splashName).length - 1) * 240 + 450)
	const splashImages = splashSettings?.images || {}
	const backgroundMode = splashSettings?.backgroundMode || "glass"
	const centerSplashContent = backgroundMode === "glass"
		|| (backgroundMode === "color" && splashSettings?.centerContentOnColor !== false)
	const useBackgroundImages = backgroundMode === "images"
	const backgroundColor = splashSettings?.backgroundColor
	const colorChannels = backgroundColor?.match(/[\da-f]{2}/gi)?.map((channel) => Number.parseInt(channel, 16)) || [7, 26, 44]
	const splashForeground = colorChannels[0] * 0.299 + colorChannels[1] * 0.587 + colorChannels[2] * 0.114 > 150 ? "#0f172a" : "#ffffff"
	const splashStyle = {
		...(backgroundColor ? { "--splash-background-color": backgroundColor, "--splash-foreground": splashForeground } : {}),
		"--splash-dark-desktop": `url("${splashImages.darkDesktop || "/images/NovaTech cover desktop.png"}")`,
		"--splash-dark-tablet": `url("${splashImages.darkTablet || "/images/NovaTech cover mobile.png"}")`,
		"--splash-dark-mobile": `url("${splashImages.darkMobile || "/images/NovaTech cover mobile.png"}")`,
		"--splash-light-desktop": `url("${splashImages.lightDesktop || "/images/NovaTech cover desktop light.png"}")`,
		"--splash-light-tablet": `url("${splashImages.lightTablet || "/images/NovaTech cover mobile light.png"}")`,
		"--splash-light-mobile": `url("${splashImages.lightMobile || "/images/NovaTech cover mobile light.png"}")`,
	} as CSSProperties
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
	const shouldShowSplash = (splashSettings?.enabled ?? clientConfig.features.showSplashScreen) && isInitialPlatformHomepage && !isLoginReturn
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
			if (!useBackgroundImages) return
			const isLight = !document.documentElement.classList.contains("dark")
			const isDesktop = window.matchMedia("(min-width: 1200px)").matches
			const isTablet = window.matchMedia("(min-width: 768px)").matches
			const imageSource = isLight
				? isDesktop ? splashImages.lightDesktop || "/images/NovaTech cover desktop light.png" : isTablet ? splashImages.lightTablet || splashImages.lightMobile || "/images/NovaTech cover mobile light.png" : splashImages.lightMobile || "/images/NovaTech cover mobile light.png"
				: isDesktop ? splashImages.darkDesktop || "/images/NovaTech cover desktop.png" : isTablet ? splashImages.darkTablet || splashImages.darkMobile || "/images/NovaTech cover mobile.png" : splashImages.darkMobile || "/images/NovaTech cover mobile.png"
			const image = new Image()
			image.decoding = "async"
			image.src = imageSource
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
					Math.max(0, Math.round((elapsed / splashDuration) * 100)),
				)
				setProgress(nextProgress)
				if (nextProgress < 100) frame = window.requestAnimationFrame(update)
			}

			if (showProgress) frame = window.requestAnimationFrame(update)
			else setProgress(100)
			finishTimer = window.setTimeout(() => {
				setVisible(false)
				setReadyToReveal(true)
			}, splashDuration + POST_LOAD_DELAY)
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
	}, [shouldShowSplash, splashDuration, showProgress, useBackgroundImages, splashImages.darkDesktop, splashImages.darkTablet, splashImages.darkMobile, splashImages.lightDesktop, splashImages.lightTablet, splashImages.lightMobile])

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
				className={`splash-screen ${backgroundMode === "images" ? "splash-screen--images" : backgroundMode === "color" ? "splash-screen--solid" : "splash-screen--glass"}${centerSplashContent ? " splash-screen--centered-content" : ""}`}
				style={splashStyle}
				role="status"
				aria-live="polite"
				aria-label={`Loading ${splashName}`}
			>
				<div className="splash-content relative z-10 flex w-full max-w-md flex-col items-center px-8 text-center">
					<p className="splash-welcome mb-3 text-xs font-extrabold uppercase tracking-[0.35em] text-primary">
						{splashSettings?.welcomeText || "Welcome to"}
					</p>
					<h1 className="splash-wordmark" aria-label={splashName}>
						{Array.from(splashName).map((character, index) => (
							<span
								key={`${character}-${index}`}
								style={{ animationDelay: `${index * 240}ms` }}
							>
								{character === " " ? "\u00a0" : character}
							</span>
						))}
					</h1>
					<img
						className="splash-logo-icon"
						src={splashLogo}
						alt=""
						aria-hidden="true"
						onError={(event) => {
							const image = event.currentTarget
							if (image.dataset.fallbackApplied !== "true") {
								image.dataset.fallbackApplied = "true"
								image.src = fallbackSplashLogo
							}
						}}
					/>
					{showProgress && <div className="splash-loading mt-10 w-full">
						<div className="mb-3 flex items-center justify-between text-sm font-extrabold text-primary">
							<span>{splashSettings?.loadingText || "Preparing your store"}</span>
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
					</div>}
				</div>
			</div>
		)
	}

	return <>{children}</>
}
