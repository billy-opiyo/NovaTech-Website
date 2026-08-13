"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { clientConfig } from "@/config/client.config"

const SPLASH_DURATION = 3600
const POST_LOAD_DELAY = 1500

export default function SplashScreen() {
	const [progress, setProgress] = useState(1)
	const [visible, setVisible] = useState(true)

	useEffect(() => {
		const startedAt = Date.now()
		let frame = 0

		const update = () => {
			const elapsed = Date.now() - startedAt
			const nextProgress = Math.min(100, Math.max(1, Math.round((elapsed / SPLASH_DURATION) * 100)))
			setProgress(nextProgress)
			if (nextProgress < 100) frame = window.requestAnimationFrame(update)
		}

		frame = window.requestAnimationFrame(update)
		// Keep the completed state visible for a short moment so the transition
		// feels intentional instead of disappearing as soon as it reaches 100%.
		const finish = window.setTimeout(() => setVisible(false), SPLASH_DURATION + POST_LOAD_DELAY)

		return () => {
			window.cancelAnimationFrame(frame)
			window.clearTimeout(finish)
		}
	}, [])

	if (!visible) return null

	return (
		<div className="splash-screen" role="status" aria-live="polite" aria-label={`Loading ${clientConfig.brand.name}`}>
			<div className="splash-orb splash-orb-one" />
			<div className="splash-orb splash-orb-two" />
			<div className="relative z-10 flex w-full max-w-md flex-col items-center px-8 text-center">
				<div className="splash-logo mb-7">
					<Image src={clientConfig.brand.logo} alt={clientConfig.brand.logoAlt} width={96} height={96} priority />
				</div>
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
