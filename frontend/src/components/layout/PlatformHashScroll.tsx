"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

function scrollToPlans() {
	if (window.location.pathname !== "/" || window.location.hash !== "#plans") return true

	const plans = document.getElementById("plans")
	if (!plans) return false

	plans.scrollIntoView({ behavior: "auto", block: "start" })
	return true
}

export default function PlatformHashScroll() {
	const pathname = usePathname()

	useEffect(() => {
		let attempts = 0
		let frame = 0

		const tryScroll = () => {
			attempts += 1
			if (scrollToPlans() || attempts >= 120) return
			frame = window.requestAnimationFrame(tryScroll)
		}

		const handleHashChange = () => {
			attempts = 0
			if (frame) window.cancelAnimationFrame(frame)
			tryScroll()
		}

		tryScroll()
		window.addEventListener("hashchange", handleHashChange)
		return () => {
			window.removeEventListener("hashchange", handleHashChange)
			if (frame) window.cancelAnimationFrame(frame)
		}
	}, [pathname])

	return null
}
