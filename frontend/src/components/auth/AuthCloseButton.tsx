"use client"

import { useRouter } from "next/navigation"
import { X } from "lucide-react"

export default function AuthCloseButton({
	fallback = "/",
	skipHistory = false,
	label = "Close authentication dialog",
}: {
	fallback?: string
	skipHistory?: boolean
	label?: string
}) {
	const router = useRouter()

	function close() {
		if (!skipHistory && document.referrer) {
			try {
				if (new URL(document.referrer).origin === window.location.origin) {
					router.back()
					return
				}
			} catch {
				// Fall back to the configured route for malformed referrers.
			}
		}
		router.push(fallback)
	}

	return (
		<button
			type="button"
			onClick={close}
			aria-label={label}
			title={label}
			className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300/70 bg-white/60 text-gray-600 shadow-sm backdrop-blur transition hover:bg-white/90 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/15 dark:bg-black/20 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
		>
			<X size={20} aria-hidden="true" />
		</button>
	)
}
