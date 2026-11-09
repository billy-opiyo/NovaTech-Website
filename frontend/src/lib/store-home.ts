import type { StoreContext } from "./store-context.types"
import { isVercelProjectHostname } from "./platform-store-route"

export function getPlatformHomepageHref(host: string, protocol: string, platformUrl: string) {
	const normalizedHost = host.trim().toLowerCase()
	const hostname = normalizedHost.split(":")[0]
	const port = normalizedHost.includes(":") ? `:${normalizedHost.split(":").pop()}` : ""
	if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
		return `${protocol}//localhost${port}/?platformHome=1`
	}
	if (isVercelProjectHostname(hostname)) return `${protocol}//${hostname}/?platformHome=1`
	return `${platformUrl.replace(/\/+$/, "")}/?platformHome=1`
}

export function getStoreHomeHref(store: Pick<StoreContext, "isPlatformHome" | "storePathPrefix" | "storeSlug">) {
	if (store.isPlatformHome) return "/?platformHome=1"
	return store.storePathPrefix || "/"
}

/** Admin workspaces always link back to a merchant storefront, never platform home. */
export function getMerchantStoreHomeHref(store: Pick<StoreContext, "isPlatformHome" | "storePathPrefix" | "storeSlug">) {
	if (store.isPlatformHome) return `/store/${encodeURIComponent(store.storeSlug)}`
	return store.storePathPrefix || "/"
}

export function getStoreRouteHref(store: Pick<StoreContext, "isPlatformHome" | "storePathPrefix" | "storeSlug">, href: string) {
	const normalizedHref = href.startsWith("/") ? href : `/${href}`
	if (store.isPlatformHome || !store.storePathPrefix) return normalizedHref
	if (normalizedHref === store.storePathPrefix || normalizedHref.startsWith(`${store.storePathPrefix}/`)) return normalizedHref
	return `${store.storePathPrefix}${normalizedHref === "/" ? "" : normalizedHref}`
}

export function shouldShowPlatformStoreNavigationLink(link: { name: string; href: string }) {
	if (/^\/?$/.test(link.href)) return link.name.trim().toLowerCase() === "home"
	if (/^\/?\?platformHome=1(?:#|$)/.test(link.href) || /^\/stores(?:\/|\?|$)/.test(link.href) || /^\/?onboarding(?:\/|\?|$)/.test(link.href) || /^\/?platform(?:\/|\?|$)/.test(link.href)) return false
	return true
}
