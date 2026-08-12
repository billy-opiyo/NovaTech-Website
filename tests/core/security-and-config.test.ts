import { test } from "node:test"
import assert from "node:assert/strict"
import { sanitizeEmail, maskSecret, isStrongPassword, sanitizeObject } from "../../backend/security"
import { generateFileKey } from "../../backend/lib/storage"
import { isStripeConfigured, getStripeWebhookSecret, getStripeClient } from "../../backend/lib/stripeClient"
import { isMpesaConfigured, verifyStkCallbackPassword } from "../../backend/lib/daraja"
import { getPaymentsConfig } from "../../backend/payments/config"
import { FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_COST, ORDER_STATUS_LABELS } from "../../frontend/src/constants"

test("security helpers normalize and protect values", () => {
	assert.equal(sanitizeEmail("  ADA@Example.COM "), "ada@example.com")
	assert.equal(maskSecret("abcdefghijkl"), "ab********kl")
	assert.equal(maskSecret("1234"), "****")
	assert.equal(isStrongPassword("Password1"), true)
	assert.equal(isStrongPassword("password"), false)
	assert.deepEqual(sanitizeObject({ name: " Ada ", count: 2 }), { name: "Ada", count: 2 })
})

test("storage keys preserve product identity and file extension", () => {
	const key = generateFileKey("p-1", "photo.jpeg")
	assert.match(key, /^products\/p-1\/\d+-[a-z0-9]+\.jpeg$/)
})

test("payment configuration reports disabled providers without secrets", () => {
	const keys = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY", "MPESA_SHORTCODE"]
	const old = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
	try {
		for (const key of keys) delete process.env[key]
		assert.equal(isStripeConfigured(), false)
		assert.equal(isMpesaConfigured(), false)
		assert.equal(getStripeWebhookSecret(), null)
		assert.deepEqual(getPaymentsConfig(), { mpesa: { configured: false, env: "sandbox" }, stripe: { configured: false } })
		assert.throws(() => getStripeClient(), /STRIPE_SECRET_KEY is not configured/)
	} finally {
		for (const key of keys) old[key] === undefined ? delete process.env[key] : (process.env[key] = old[key])
	}
})

test("STK callback password verification is deterministic", () => {
	const timestamp = "20260812101010"
	const expected = Buffer.from(`174379pass${timestamp}`).toString("base64")
	assert.equal(verifyStkCallbackPassword("174379", "pass", timestamp, expected), true)
	assert.equal(verifyStkCallbackPassword("174379", "pass", timestamp, `${expected}x`), false)
})

test("store constants expose checkout and status rules", () => {
	assert.equal(FREE_SHIPPING_THRESHOLD, 50000)
	assert.equal(DEFAULT_SHIPPING_COST, 500)
	assert.equal(ORDER_STATUS_LABELS.OUT_FOR_DELIVERY, "Out for Delivery")
})
