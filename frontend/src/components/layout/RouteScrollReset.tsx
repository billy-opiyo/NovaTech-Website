"use client"

import { useLayoutEffect } from "react"
import { usePathname } from "next/navigation"

/** Keep ordinary client-side route changes anchored at the top of the new page. */
export default function RouteScrollReset() {
	const pathname = usePathname()

	useLayoutEffect(() => {
		// Hash links intentionally target a section, such as the platform plans.
		if (window.location.hash) return

		const root = document.documentElement
		const previousScrollBehavior = root.style.scrollBehavior
		root.style.scrollBehavior = "auto"
		window.scrollTo(0, 0)
		root.style.scrollBehavior = previousScrollBehavior
	}, [pathname])

	return null
}
