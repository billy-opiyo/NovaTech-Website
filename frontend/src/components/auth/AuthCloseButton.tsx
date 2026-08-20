"use client"

import { useRouter } from "next/navigation"
import { X } from "lucide-react"

export default function AuthCloseButton({ fallback = "/", skipHistory = false }: { fallback?: string; skipHistory?: boolean }) {
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
			aria-label="Close"
			title="Close"
			className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-black/10 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
		>
			<X size={20} aria-hidden="true" />
		</button>
	)
}
