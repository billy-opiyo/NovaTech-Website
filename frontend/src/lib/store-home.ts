import { isVercelProjectHostname } from "./platform-store-route"
import type { StoreContext } from "./store-context.types"

function isLocalHost(hostname: string) {
	return hostname === "localhost" || hostname === "127.0.0.1"
}

export function getStoreHomeHref(store: StoreContext) {
	if (store.isPlatformHome) return "/?platformHome=1"

	const storeHref = `/store/${encodeURIComponent(store.storeSlug)}`
	if (typeof window === "undefined") return storeHref

	const hostname = window.location.hostname.toLowerCase()
	let configuredHostname = ""
	try {
		configuredHostname = new URL(store.site.url).hostname.toLowerCase()
	} catch {
		// A malformed optional site URL should not prevent sign-out.
	}

	const isPlatformHost = isLocalHost(hostname)
		|| isVercelProjectHostname(hostname)
		|| hostname === configuredHostname
		|| hostname === `www.${configuredHostname}`

	return isPlatformHost ? storeHref : "/"
}
