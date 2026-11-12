import { test } from "node:test"
import assert from "node:assert/strict"
import { createOrderIdempotencyKey } from "../../backend/lib/order-idempotency"

const scope = {
	tenantId: "store-1",
	ownerScope: "guest:shopper@example.com",
	clientKey: "retry-key",
}

const checkout = {
	items: [{ productId: "cake-1", quantity: 1, customizations: { message: "Happy birthday", icing: "vanilla" } }],
	shippingAddress: { town: "Nairobi", email: "shopper@example.com" },
	deliveryMethod: "standard",
	paymentMethod: "MPESA",
	couponCode: "SAVE10",
	notes: "Call on arrival",
}

test("the same complete checkout retry resolves to the same scoped digest", () => {
	assert.equal(
		createOrderIdempotencyKey({ ...scope, checkout }),
		createOrderIdempotencyKey({ ...scope, checkout: { ...checkout, shippingAddress: { email: "shopper@example.com", town: "Nairobi" } } }),
	)
})

test("changed checkout details cannot replay an order from the original payload", () => {
	const original = createOrderIdempotencyKey({ ...scope, checkout })
	for (const changed of [
		{ ...checkout, shippingAddress: { ...checkout.shippingAddress, town: "Mombasa" } },
		{ ...checkout, paymentMethod: "PAY_ON_DELIVERY" },
		{ ...checkout, deliveryMethod: "express" },
		{ ...checkout, couponCode: "OTHER" },
		{ ...checkout, notes: "Leave at reception" },
		{ ...checkout, items: [{ ...checkout.items[0], variant: "large" }] },
		{ ...checkout, items: [{ ...checkout.items[0], customizations: { ...checkout.items[0].customizations, message: "Congratulations" } }] },
	]) {
		assert.notEqual(createOrderIdempotencyKey({ ...scope, checkout: changed }), original)
	}
})

test("idempotency digests are isolated by tenant, owner, and client key", () => {
	const original = createOrderIdempotencyKey({ ...scope, checkout })
	assert.notEqual(createOrderIdempotencyKey({ ...scope, tenantId: "store-2", checkout }), original)
	assert.notEqual(createOrderIdempotencyKey({ ...scope, ownerScope: "guest:other@example.com", checkout }), original)
	assert.notEqual(createOrderIdempotencyKey({ ...scope, clientKey: "different-key", checkout }), original)
})
