import { test, afterEach } from "node:test"
import assert from "node:assert/strict"
import { ApiError, apiFetch, buildQueryString } from "../../frontend/src/services/api"
import { getProducts, getProductBySlug, searchProducts } from "../../frontend/src/services/products"
import { getMyOrders, createOrder, updateOrderStatus, getOrderTracking } from "../../frontend/src/services/orders"
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from "../../frontend/src/services/cart"
import { getTickets, getTicketStats, getTicketById, updateTicket, replyToTicket, submitContact } from "../../frontend/src/services/support"

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
