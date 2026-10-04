import { test, afterEach } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { ApiError, apiFetch, buildQueryString } from "../../frontend/src/services/api"
import { getProducts, getProductBySlug, searchProducts } from "../../frontend/src/services/products"
import { getMyOrders, createOrder, updateOrderStatus, getOrderTracking } from "../../frontend/src/services/orders"
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from "../../frontend/src/services/cart"
import { getTickets, getTicketStats, getTicketById, updateTicket, replyToTicket, submitContact } from "../../frontend/src/services/support"
import { getMerchantWhatsAppHref, getWhatsAppChatHref, normalizeWhatsAppNumber } from "../../frontend/src/lib/merchant-contact"
import { getMerchantStoreHomeHref, getStoreHomeHref, getStoreRouteHref } from "../../frontend/src/lib/store-home"
import { getStorePublicHref, resolveDirectoryStoreLogo } from "../../frontend/src/lib/platform-store-route"

const originalFetch = globalThis.fetch
let requests: { url: string; init?: RequestInit }[] = []

afterEach(() => {
	globalThis.fetch = originalFetch
	requests = []
})

function mockFetch(body: unknown, ok = true, status = 200) {
	requests = []
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		requests.push({ url: String(input), init })
		return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
	}) as typeof fetch
}

test("buildQueryString omits empty values and encodes filters", () => {
	assert.equal(buildQueryString({ page: 2, search: "phone case", enabled: true, empty: "", missing: undefined }), "?page=2&search=phone+case&enabled=true")
	assert.equal(buildQueryString({}), "")
})

test("apiFetch applies JSON headers and exposes structured API errors", async () => {
	mockFetch({ ok: true })
	assert.deepEqual(await apiFetch("/api/test"), { ok: true })
	assert.equal(requests[0].init?.headers && (requests[0].init?.headers as Record<string, string>)["Content-Type"], "application/json")
	mockFetch({ message: "No access", errors: [{ field: "auth" }] }, false, 403)
	await assert.rejects(() => apiFetch("/api/private"), (error: unknown) => {
		assert.ok(error instanceof ApiError)
		assert.equal((error as ApiError).status, 403)
		assert.equal((error as ApiError).message, "No access")
		return true
	})
})

test("product services build the expected catalog requests", async () => {
	mockFetch({ products: [], total: 0, page: 1, totalPages: 0 })
	await getProducts({ search: "laptop", page: 2 })
	assert.equal(requests[0].url, "/api/products?search=laptop&page=2")
	mockFetch({ id: "p1" })
	await getProductBySlug("nova-phone")
	assert.equal(requests[0].url, "/api/products/nova-phone")
	mockFetch([])
	await searchProducts("phone case")
	assert.equal(requests[0].url, "/api/products?q=phone%20case")
})

test("order services cover reads, creation, status updates, and tracking", async () => {
	mockFetch({ orders: [], total: 0 })
	await getMyOrders(3, 10)
	assert.equal(requests[0].url, "/api/orders?page=3&limit=10")
	mockFetch({ id: "o1" })
	await createOrder({ items: [], shippingAddress: {} as never, deliveryMethod: "standard", paymentMethod: "cod", subtotal: 1, shippingCost: 0, total: 1 })
	assert.equal(requests[0].init?.method, "POST")
	mockFetch({ id: "o1" })
	await updateOrderStatus("o1", "SHIPPED", "TRK-1")
	assert.equal(requests[0].init?.method, "PATCH")
	assert.equal(requests[0].init?.body, JSON.stringify({ status: "SHIPPED", trackingNumber: "TRK-1" }))
	mockFetch({ status: "SHIPPED" })
	await getOrderTracking("o1")
	assert.equal(requests[0].url, "/api/orders/o1/tracking")
})

test("cart services use the correct REST verbs and payloads", async () => {
	for (const [call, expectedMethod, expectedUrl] of [
		[() => getCart(), undefined, "/api/cart"],
		[() => addToCart("p1", 2, "Blue"), "POST", "/api/cart"],
		[() => updateCartItem("i1", 3), "PATCH", "/api/cart/i1"],
		[() => removeCartItem("i1"), "DELETE", "/api/cart/i1"],
		[() => clearCart(), "DELETE", "/api/cart"],
	] as const) {
		mockFetch({ items: [] })
		await call()
		assert.equal(requests[0].url, expectedUrl)
		assert.equal(requests[0].init?.method, expectedMethod)
	}
})

test("support services cover list, stats, ticket mutation, replies, and contact", async () => {
	const calls: [() => Promise<unknown>, string, string | undefined][] = [
		[() => getTickets({ status: "open", page: 2 }), "/api/support/tickets?status=open&page=2", undefined],
		[() => getTicketStats(), "/api/support/tickets?stats=true", undefined],
		[() => getTicketById("t1"), "/api/support/tickets/t1", undefined],
		[() => updateTicket("t1", { status: "resolved" }), "/api/support/tickets/t1", "PATCH"],
		[() => replyToTicket("t1", "Done"), "/api/support/tickets/t1", "POST"],
		[() => submitContact({ name: "Ada", email: "ada@example.com", subject: "Help", message: "Please help me." }), "/api/contact", "POST"],
	]
	for (const [call, url, method] of calls) {
		mockFetch({ ok: true })
		await call()
		assert.equal(requests[0].url, url)
		assert.equal(requests[0].init?.method, method)
	}
})

test("store navigation keeps merchant routes inside the active storefront", () => {
	const merchant = { isPlatformHome: false, storePathPrefix: "/store/demo", storeSlug: "demo" }
	const platform = { isPlatformHome: true, storePathPrefix: "", storeSlug: "nuravatech" }
	assert.equal(getStoreHomeHref(merchant), "/store/demo")
	assert.equal(getMerchantStoreHomeHref(merchant), "/store/demo")
	assert.equal(getMerchantStoreHomeHref(platform), "/store/nuravatech")
	assert.equal(getStoreRouteHref(merchant, "/category/phones"), "/store/demo/category/phones")
	assert.equal(getStoreRouteHref(merchant, "/store/demo/products"), "/store/demo/products")
	assert.equal(getStoreRouteHref(platform, "/stores?all=1"), "/stores?all=1")
})

test("platform store cards prefer each store logo and use the Nurava storefront logo as its fallback", () => {
	assert.equal(resolveDirectoryStoreLogo("nuravatech", null, "/images/nurava-logo.png"), "/images/nurava-logo.png")
	assert.equal(resolveDirectoryStoreLogo("nuravatech", "https://cdn.example.com/store-logo.webp", "/images/nurava-logo.png"), "https://cdn.example.com/store-logo.webp")
	assert.equal(resolveDirectoryStoreLogo("another-store", null, "/images/nurava-logo.png"), null)
})

test("platform store card destinations open the selected storefront directly", () => {
	assert.equal(getStorePublicHref("nuravatech", "nuravatech-saas-staging.vercel.app", "nuravatech.com"), "https://nuravatech-saas-staging.vercel.app/store/nuravatech")
	assert.equal(getStorePublicHref("demo-store", "localhost:3000", "nuravatech.com"), "http://demo-store.localhost:3000")
	assert.equal(getStorePublicHref("demo-store", "nuravatech.com", "nuravatech.com"), "https://demo-store.nuravatech.com")
})

test("platform store cards request a fresh tenant-scoped storefront page", () => {
	const hero = readFileSync("frontend/src/components/home/PlatformHero.tsx", "utf8")
	const card = hero.slice(hero.indexOf("function StoreCard"), hero.indexOf("function TrustStrip"))
	assert.match(card, /<a\s+href={store\.href}/)
	assert.doesNotMatch(card, /<Link\s+href={store\.href}/)
	assert.match(hero, /nurava-furnitures/)
	assert.match(hero, /nurava-cakes/)
	const seed = readFileSync("backend/prisma/seed.ts", "utf8")
	assert.match(seed, /storeName: "Nurava Furnitures"[\s\S]*?storeSlug: "nurava-furnitures"/)
	assert.match(seed, /storeName: "Nurava Cakes"[\s\S]*?storeSlug: "nurava-cakes"/)
})

test("storefront hero actions remain centered at mobile and desktop widths", () => {
	const hero = readFileSync("frontend/src/components/home/HeroBanner.tsx", "utf8")
	assert.match(hero, /mx-auto flex w-full flex-col items-center justify-center gap-3 sm:flex-row/)
})

test("storefront footer copy is store-specific while platform footer copy remains configurable", () => {
	const footer = readFileSync("frontend/src/components/layout/Footer.tsx", "utf8")
	assert.match(footer, /store\.isPlatformHome[\s\S]*?store\.site\.footerDescription[\s\S]*?: store\.homepage\.heroDescription/)
	assert.match(footer, /Explore the products and offers available from \$\{store\.brand\.name\}/)
})

test("interactive links and enabled buttons show pointer cursors site-wide", () => {
	const styles = readFileSync("frontend/src/app/globals.css", "utf8")
	assert.match(styles, /a\[href\]:not\(\[aria-disabled="true"\]\):hover,[\s\S]*?button:not\(:disabled\):not\(\[aria-disabled="true"\]\):hover,[\s\S]*?cursor: pointer/)
})

test("platform header reuses search overlay with available-store suggestions", () => {
	const header = readFileSync("frontend/src/components/layout/Header.tsx", "utf8")
	const search = readFileSync("frontend/src/components/search/SearchOverlay.tsx", "utf8")
	const endpoint = readFileSync("frontend/src/app/api/public/store-search/route.ts", "utf8")
	assert.match(header, /store\.isPlatformHome && <SearchOverlay compactTrigger \/>/)
	assert.match(search, /\/api\/public\/store-search\?q=/)
	assert.match(search, /h-9 w-9 min-w-9 shrink-0/)
	assert.match(search, /!compactTrigger && <>[\s\S]*?Search pages &amp; products[\s\S]*?<kbd/)
	assert.match(search, /Search size=\{compactTrigger \? 20 : 16\}/)
	assert.match(search, /Search pages and stores\.\.\./)
	assert.match(search, /\[\.\.\.pageSuggestions, \.\.\.storeSuggestions\]/)
	assert.match(search, /suggestions\[selectedIndex\]\.type === "store"\) window\.location\.assign/)
	assert.match(search, /suggestion\.type === "store"[\s\S]*?<a key=\{i\} href=\{suggestion\.href\}/)
	assert.match(endpoint, /getPublishedStores\(\)/)
	assert.match(endpoint, /getStorePublicUrl\(store\.slug\)/)
})

test("merchant WhatsApp links normalize customer contact numbers", () => {
	assert.equal(normalizeWhatsAppNumber("+254 700 123 456"), "254700123456")
	assert.equal(getWhatsAppChatHref("+254 700 123 456", "Hello"), "https://wa.me/254700123456?text=Hello")
	assert.match(getMerchantWhatsAppHref({ number: "+254 700 123 456", storeName: "Nurava Tech", items: [] }), /^https:\/\/wa\.me\/254700123456\?text=/)
	assert.equal(getWhatsAppChatHref("", "Hello"), "")
})
