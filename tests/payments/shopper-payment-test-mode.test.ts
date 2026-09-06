import { test } from "node:test"
import assert from "node:assert/strict"
import { getNuravaShopperPaymentTestConfig, isNuravaShopperPaymentTestMode } from "../../backend/lib/shopper-payment-test-mode"

const keys = ["SHOPPER_PAYMENTS_TEST_MODE", "SHOPPER_PAYMENTS_TEST_TENANT_SLUG", "NURAVA_DEPLOYMENT_TIER", "MPESA_ENV", "MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY", "MPESA_SHORTCODE", "VERCEL_ENV"] as const

function withEnvironment(values: Record<string, string | undefined>, callback: () => void) {
	const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
	try {
		for (const key of keys) delete process.env[key]
		for (const [key, value] of Object.entries(values)) if (value !== undefined) process.env[key] = value
		callback()
	} finally {
		for (const key of keys) {
			const value = previous[key]
			if (value === undefined) delete process.env[key]
			else process.env[key] = value
		}
	}
}

test("Nurava staging shopper payment fixture is limited to the configured tenant and sandbox", () => {
	withEnvironment({ SHOPPER_PAYMENTS_TEST_MODE: "true", SHOPPER_PAYMENTS_TEST_TENANT_SLUG: "nuravatech", MPESA_ENV: "sandbox" }, () => {
		assert.equal(isNuravaShopperPaymentTestMode("nuravatech"), true)
		assert.equal(isNuravaShopperPaymentTestMode("another-store"), false)
	})
})

test("Nurava staging shopper payment fixture accepts the explicitly marked staging Vercel deployment", () => {
	withEnvironment({ SHOPPER_PAYMENTS_TEST_MODE: "true", SHOPPER_PAYMENTS_TEST_TENANT_SLUG: "nuravatech", NURAVA_DEPLOYMENT_TIER: "staging", MPESA_ENV: "sandbox", VERCEL_ENV: "production" }, () => {
		assert.equal(isNuravaShopperPaymentTestMode("nuravatech"), true)
	})
})

test("Nurava staging shopper payment fixture is disabled for an unmarked production deployment", () => {
	withEnvironment({ SHOPPER_PAYMENTS_TEST_MODE: "true", SHOPPER_PAYMENTS_TEST_TENANT_SLUG: "nuravatech", MPESA_ENV: "sandbox", VERCEL_ENV: "production" }, () => {
		assert.equal(isNuravaShopperPaymentTestMode("nuravatech"), false)
	})
})

test("Nurava staging shopper payment fixture reuses only configured sandbox billing credentials", () => {
	withEnvironment({ SHOPPER_PAYMENTS_TEST_MODE: "true", SHOPPER_PAYMENTS_TEST_TENANT_SLUG: "nuravatech", NURAVA_DEPLOYMENT_TIER: "staging", MPESA_ENV: "sandbox", MPESA_CONSUMER_KEY: "sandbox-consumer-key", MPESA_CONSUMER_SECRET: "sandbox-consumer-secret", MPESA_PASSKEY: "sandbox-passkey", MPESA_SHORTCODE: "174379" }, () => {
		assert.deepEqual(getNuravaShopperPaymentTestConfig("nuravatech"), { consumerKey: "sandbox-consumer-key", consumerSecret: "sandbox-consumer-secret", passkey: "sandbox-passkey", shortcode: "174379", accountType: "PAYBILL" })
	})
})
