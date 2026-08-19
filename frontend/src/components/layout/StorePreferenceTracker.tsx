"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { PREFERRED_STORE_COOKIE } from "@/lib/store-preference"

export default function StorePreferenceTracker({ storeSlug, isPlatformHome }: { storeSlug: string; isPlatformHome: boolean }) {
	const pathname = usePathname()

	useEffect(() => {
		if (isPlatformHome || pathname.startsWith("/stores") || pathname.startsWith("/manage") || pathname.startsWith("/platform")) return

		document.cookie = `${PREFERRED_STORE_COOKIE}=${encodeURIComponent(storeSlug)}; Path=/; Max-Age=15552000; SameSite=Lax`
		void fetch("/api/store-preference", { method: "POST", credentials: "same-origin" }).catch(() => undefined)
	}, [isPlatformHome, pathname, storeSlug])

	return null
}
