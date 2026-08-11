import { test } from "node:test"
import assert from "node:assert/strict"
import { createCardPaymentIntent, verifyCardPayment } from "../../backend/payments/cards"

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