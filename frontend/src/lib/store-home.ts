import type { StoreContext } from "./store-context.types"

export function getStoreHomeHref(store: Pick<StoreContext, "isPlatformHome" | "storePathPrefix" | "storeSlug">) {
	if (store.isPlatformHome) return "/?platformHome=1"
	return store.storePathPrefix || "/"
}

export function getStoreRouteHref(store: Pick<StoreContext, "isPlatformHome" | "storePathPrefix" | "storeSlug">, href: string) {
	const normalizedHref = href.startsWith("/") ? href : `/${href}`
	if (store.isPlatformHome || !store.storePathPrefix) return normalizedHref
	if (normalizedHref === store.storePathPrefix || normalizedHref.startsWith(`${store.storePathPrefix}/`)) return normalizedHref
	return `${store.storePathPrefix}${normalizedHref === "/" ? "" : normalizedHref}`
}
