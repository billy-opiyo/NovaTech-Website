import { test } from "node:test"
import assert from "node:assert/strict"
import { initiateMpesaPayment, verifyMpesaPayment, simulateMpesaPayment, generateTimestamp, getShopperOrderPaymentReference, shopperPaymentMatchesOrder, mergeMpesaPaymentMetadata } from "../../backend/payments/mpesa"
import { canAccessShopperOrder } from "../../backend/payments/shopper-order-access"

test("shopper M-Pesa references preserve full order identity and existing payments stay order-bound", () => {
	assert.equal(getShopperOrderPaymentReference("order-a-01234567"), "ORD-order-a-01234567")
	assert.notEqual(getShopperOrderPaymentReference("order-a-01234567"), getShopperOrderPaymentReference("order-b-01234567"))
	assert.equal(shopperPaymentMatchesOrder({ orderId: "order-a", amount: 500 }, "order-a", 500), true)
	assert.equal(shopperPaymentMatchesOrder({ orderId: "order-a", amount: 500 }, "order-b", 500), false)
	assert.equal(shopperPaymentMatchesOrder({ orderId: "order-a", amount: 500 }, "order-a", 600), false)
	assert.deepEqual(mergeMpesaPaymentMetadata({ reference: "forged-reference", merchantRequestId: "forged-request", note: "retained" }, "ORD-order-a", "request-1"), { note: "retained", reference: "ORD-order-a", merchantRequestId: "request-1" })
})

test("shopper payment verification checks the same registered or guest owner as initiation", () => {
	assert.equal(canAccessShopperOrder({ userId: "user-1", shippingAddress: { phone: "+254712345678" } }, "user-1", "0700000000"), true)
	assert.equal(canAccessShopperOrder({ userId: "user-1", shippingAddress: null }, "user-2", "0712345678"), false)
	assert.equal(canAccessShopperOrder({ userId: null, shippingAddress: { phone: "+254712345678" } }, undefined, "0712345678"), true)
	assert.equal(canAccessShopperOrder({ userId: null, shippingAddress: { phone: "+254712345678" } }, undefined, "0799999999"), false)
	assert.equal(canAccessShopperOrder({ userId: null, shippingAddress: null }, undefined, "0712345678"), false)
})

test("M-Pesa payment operations return actionable not-configured results", async () => {
	const keys = ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY", "MPESA_SHORTCODE"]
	const old = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
	try {
		for (const key of keys) delete process.env[key]
		const initiate = await initiateMpesaPayment({ amount: 100, phone: "0712345678", reference: "ORDER-1" })
		assert.equal(initiate.ok, false)
		assert.match(initiate.message || "", /not configured/i)
		const verify = await verifyMpesaPayment("checkout-1")
		assert.equal(verify.status, "FAILED")
		const simulated = await simulateMpesaPayment({ amount: 100, phone: "0712345678", reference: "ORDER-1" })
		assert.equal(simulated.ok, false)
		assert.match(simulated.message, /credentials/i)
	} finally {
		for (const key of keys) old[key] === undefined ? delete process.env[key] : (process.env[key] = old[key])
	}
})

test("M-Pesa timestamp follows the Daraja 14-digit format", () => {
	assert.match(generateTimestamp(), /^\d{14}$/)
})
