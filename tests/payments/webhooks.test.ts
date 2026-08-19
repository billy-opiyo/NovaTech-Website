import { test } from "node:test"
import assert from "node:assert/strict"
import {
	handleMpesaStkCallback,
	handleStripeEvent,
	paymentOrderBelongsToTenant,
} from "../../backend/payments/webhooks"

test("payment callbacks require matching tenant ownership", () => {
	assert.equal(paymentOrderBelongsToTenant("tenant-a", "tenant-a"), true)
	assert.equal(paymentOrderBelongsToTenant("tenant-a", "tenant-b"), false)
	assert.equal(paymentOrderBelongsToTenant(null, "tenant-a"), false)
})

test("handleMpesaStkCallback processes successful STK callback", async () => {
	const result = await handleMpesaStkCallback({
		Body: {
			stkCallback: {
				MerchantRequestID: "MER-001",
				CheckoutRequestID: "WS_CO_001",
				ResultCode: 0,
				ResultDesc: "The service request is processed successfully.",
				CallbackMetadata: {
					Item: [
						{ Name: "Amount", Value: 1000 },
						{ Name: "MpesaReceiptNumber", Value: "PBK1234567" },
						{ Name: "PhoneNumber", Value: 254712345678 },
					],
				},
			},
		},
	})

	assert.equal(result.ok, true)
	assert.equal(result.provider, "mpesa")
	assert.equal(result.event, "stk-callback")
	assert.match(result.message || "", /PBK1234567/)
})

test("handleMpesaStkCallback processes failed STK callback", async () => {
	const result = await handleMpesaStkCallback({
		Body: {
			stkCallback: {
				MerchantRequestID: "MER-002",
				CheckoutRequestID: "WS_CO_002",
				ResultCode: 1032,
				ResultDesc: "Request cancelled by user",
			},
		},
	})

	assert.equal(result.ok, false)
	assert.equal(result.provider, "mpesa")
	assert.match(result.message || "", /cancelled/i)
})

test("handleMpesaStkCallback rejects invalid payload", async () => {
	const result = await handleMpesaStkCallback({
		Body: {} as never,
	})

	assert.equal(result.ok, false)
	assert.equal(result.received, false)
})

test("handleStripeEvent maps payment_intent.succeeded to COMPLETED", async () => {
	const result = await handleStripeEvent({
		type: "payment_intent.succeeded",
		data: {
			object: {
				id: "pi_123",
			},
		},
	})

	assert.equal(result.ok, true)
	assert.equal(result.provider, "stripe")
	assert.equal(result.event, "payment_intent.succeeded")
	assert.match(result.message || "", /COMPLETED/)
})

test("handleStripeEvent maps charge.refunded to REFUNDED", async () => {
	const result = await handleStripeEvent({
		type: "charge.refunded",
		data: {
			object: {
				id: "pi_456",
			},
		},
	})

	assert.equal(result.ok, true)
	assert.equal(result.provider, "stripe")
	assert.match(result.message || "", /REFUNDED/)
})

test("handleStripeEvent handles unknown events gracefully", async () => {
	const result = await handleStripeEvent({
		type: "customer.created",
		data: {
			object: {
				id: "cus_789",
			},
		},
	})

	assert.equal(result.ok, true)
	assert.equal(result.provider, "stripe")
	assert.match(result.message || "", /no payment status mapping/)
})
