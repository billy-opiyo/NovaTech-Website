import { test } from "node:test"
import assert from "node:assert/strict"
import { initiateMpesaPayment, verifyMpesaPayment, simulateMpesaPayment, generateTimestamp } from "../../backend/payments/mpesa"

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
