import { test } from "node:test"
import assert from "node:assert/strict"
import { createCardPaymentIntent, mergeCardPaymentMetadata, shouldCancelOrderAfterCardVerification, verifyCardPayment } from "../../backend/payments/cards"

test("trusted Stripe payment metadata overrides internal metadata collisions", () => {
	assert.deepEqual(mergeCardPaymentMetadata({ reference: "forged", orderId: "other-order", clientSecret: "forged-secret", note: "safe" }, {
		reference: "trusted-reference",
		orderId: "actual-order",
		clientSecret: "trusted-secret",
	}), {
		reference: "trusted-reference",
		orderId: "actual-order",
		clientSecret: "trusted-secret",
		note: "safe",
	})
})

test("createCardPaymentIntent returns not-configured result when Stripe is unset", async () => {
	// Ensure STRIPE_SECRET_KEY is not set for this test
	const original = process.env.STRIPE_SECRET_KEY
	delete process.env.STRIPE_SECRET_KEY

	try {
		const result = await createCardPaymentIntent({
			amount: 1000,
			customerEmail: "test@example.com",
			reference: "REF-001",
		})

		assert.equal(result.ok, false)
		assert.equal(result.provider, "stripe")
		assert.equal(result.status, "FAILED")
		assert.match(result.message || "", /not configured/i)
	} finally {
		if (original) process.env.STRIPE_SECRET_KEY = original
	}
})

test("verifyCardPayment returns not-configured result when Stripe is unset", async () => {
	const original = process.env.STRIPE_SECRET_KEY
	delete process.env.STRIPE_SECRET_KEY

	try {
		const result = await verifyCardPayment("pi_123")

		assert.equal(result.ok, false)
		assert.equal(result.provider, "stripe")
		assert.equal(result.status, "FAILED")
		assert.match(result.message || "", /not configured/i)
	} finally {
		if (original) process.env.STRIPE_SECRET_KEY = original
	}
})

test("pending Stripe verification never cancels an order", () => {
	assert.equal(shouldCancelOrderAfterCardVerification("PENDING"), false)
	assert.equal(shouldCancelOrderAfterCardVerification("PROCESSING"), false)
	assert.equal(shouldCancelOrderAfterCardVerification("COMPLETED"), false)
	assert.equal(shouldCancelOrderAfterCardVerification("FAILED"), true)
	assert.equal(shouldCancelOrderAfterCardVerification("CANCELLED"), true)
})
