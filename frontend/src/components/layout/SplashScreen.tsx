"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { clientConfig } from "@/config/client.config"

const SPLASH_DURATION = 5000

export default function SplashScreen() {
	const pathname = usePathname()
	const routeScope = pathname.startsWith("/admin") ? "admin" : "public"
	const shownScopes = useRef(new Set<string>())
	const [progress, setProgress] = useState(1)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		if (shownScopes.current.has(routeScope)) {
			setVisible(false)
			return
		}

		shownScopes.current.add(routeScope)
		setProgress(1)
		setVisible(true)
	}, [routeScope])

	useEffect(() => {
		if (!visible) return

		const startedAt = Date.now()
		let frame = 0

		const update = () => {
			const elapsed = Date.now() - startedAt
			const nextProgress = Math.min(100, Math.max(1, Math.round((elapsed / SPLASH_DURATION) * 100)))
			setProgress(nextProgress)
			if (nextProgress < 100) frame = window.requestAnimationFrame(update)
		}

		frame = window.requestAnimationFrame(update)
		const finish = window.setTimeout(() => setVisible(false), SPLASH_DURATION)

		return () => {
			window.cancelAnimationFrame(frame)
			window.clearTimeout(finish)
		}
	}, [routeScope, visible])

	useEffect(() => {
		if (!visible) return

		const html = document.documentElement
		const body = document.body
		const previousHtmlOverflow = html.style.overflow
		const previousBodyOverflow = body.style.overflow
		const previousBodyTouchAction = body.style.touchAction
		const previousHtmlOverscrollBehavior = html.style.overscrollBehavior

		html.style.overflow = "hidden"
		html.style.overscrollBehavior = "none"
		body.style.overflow = "hidden"
		body.style.touchAction = "none"

		return () => {
			html.style.overflow = previousHtmlOverflow
			html.style.overscrollBehavior = previousHtmlOverscrollBehavior
			body.style.overflow = previousBodyOverflow
			body.style.touchAction = previousBodyTouchAction
		}
	}, [visible])

	if (!visible) return null

	return (
		<div className="splash-screen" role="status" aria-live="polite" aria-label={`Loading ${clientConfig.brand.name}`}>
			<div className="relative z-10 flex w-full max-w-md flex-col items-center px-8 text-center">
				<p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-blue-200">Welcome to</p>
				<h1 className="splash-wordmark" aria-label={clientConfig.brand.name}>
					{Array.from(clientConfig.brand.name).map((character, index) => (
						<span key={`${character}-${index}`} style={{ animationDelay: `${index * 240}ms` }}>
							{character === " " ? "\u00a0" : character}
						</span>
					))}
				</h1>
				<div className="mt-10 w-full">
					<div className="mb-3 flex items-center justify-between text-sm text-slate-300">
						<span>Preparing your store</span>
						<span className="tabular-nums">{progress}%<span className="splash-ellipsis" aria-label="Loading">
							<span>.</span><span>.</span><span>.</span>
						</span></span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
						<div className="splash-progress h-full rounded-full" style={{ width: `${progress}%` }} />
					</div>
				</div>
			</div>
		</div>
	)
}
