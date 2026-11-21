const HOME_CACHE = "nurava-platform-home-v1"
const ASSET_CACHE = "nurava-static-assets-v1"
const ALLOWLIST_KEY = new URL("/__offline-app-assets.json", self.location.origin).href

self.addEventListener("install", (event) => {
	event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim())
})

self.addEventListener("message", (event) => {
	if (event.data?.type !== "cache-platform-home") return
	event.waitUntil((async () => {
		const homeCache = await caches.open(HOME_CACHE)
		const homeUrl = new URL("/", self.location.origin).href
		if (!(await homeCache.match(homeUrl))) {
			try {
				const response = await fetch(homeUrl, { credentials: "same-origin", cache: "no-store" })
				if (response.ok && response.headers.get("content-type")?.includes("text/html")) await homeCache.put(homeUrl, response)
			} catch { /* Keep the app usable if warming the offline copy fails. */ }
		}

		const assetCache = await caches.open(ASSET_CACHE)
		const assetUrls = Array.isArray(event.data.assetUrls) ? event.data.assetUrls : []
		const configuredImages = Array.isArray(event.data.configuredImages) ? event.data.configuredImages : []
		const allowedImages = configuredImages.map((value) => {
			try {
				if (typeof value !== "string" || !value.trim()) return null
				const url = new URL(value, self.location.origin)
				return url.protocol === "https:" || url.origin === self.location.origin ? url.href : null
			} catch { return null }
		}).filter(Boolean).slice(0, 20)
		await assetCache.put(ALLOWLIST_KEY, new Response(JSON.stringify(allowedImages), { headers: { "Content-Type": "application/json" } }))
		await Promise.all(allowedImages.map(async (value) => {
			try {
				if (await assetCache.match(value)) return
				const response = await fetch(value, { mode: "no-cors", cache: "force-cache" })
				if (response.ok || response.type === "opaque") await assetCache.put(value, response)
			} catch { /* Keep working if a configured remote image cannot be warmed. */ }
		}))
		await Promise.all(assetUrls.map(async (value) => {
			try {
				const url = new URL(value)
				const isStatic = url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")
				const isLocalImage = url.origin === self.location.origin && /\.(?:png|webp|svg|jpe?g|gif)$/i.test(url.pathname)
				if (!isStatic && !isLocalImage) return
				if (await assetCache.match(url.href)) return
				const response = await fetch(url.href, { credentials: "same-origin", cache: "force-cache" })
				if (response.ok && response.type === "basic") await assetCache.put(url.href, response)
			} catch { /* Ignore individual resources that are no longer available. */ }
		}))
	})())
})

self.addEventListener("fetch", (event) => {
	const request = event.request
	if (request.method !== "GET") return
	const url = new URL(request.url)
	if (request.destination === "image") {
		event.respondWith((async () => {
			const cache = await caches.open(ASSET_CACHE)
			const allowlistResponse = await cache.match(ALLOWLIST_KEY)
			const allowedImages = allowlistResponse ? await allowlistResponse.json() : []
			if (!allowedImages.includes(url.href)) return fetch(request)
			const cached = await cache.match(request)
			if (cached) return cached
			try {
				const response = await fetch(request)
				if (response.ok || response.type === "opaque") await cache.put(request, response.clone())
				return response
			} catch (error) {
				const fallback = await cache.match(request)
				if (fallback) return fallback
				throw error
			}
		})())
		return
	}
	if (url.origin !== self.location.origin) return

	if (request.mode === "navigate") {
		// Only persist the platform root. Never substitute a cached tenant, admin,
		// account, or other route after a failed navigation.
		if (url.pathname !== "/") return
		event.respondWith((async () => {
			const cache = await caches.open(HOME_CACHE)
			try {
				const response = await fetch(request)
				if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
					await cache.put("/", response.clone())
				}
				return response
			} catch (error) {
				const cached = await cache.match("/")
				if (cached) return cached
				throw error
			}
		})())
		return
	}

	const isStaticAsset = url.pathname.startsWith("/_next/static/") || ["image", "font", "style", "script"].includes(request.destination)
	if (!isStaticAsset) return
	event.respondWith((async () => {
		const cache = await caches.open(ASSET_CACHE)
		const cached = await cache.match(request)
		if (cached) return cached
		const response = await fetch(request)
		if (response.ok && response.type === "basic") await cache.put(request, response.clone())
		return response
	})())
})
