import { test } from "node:test"
import assert from "node:assert/strict"
import { canMerchantSell, getMerchantOnboardingMode } from "../../backend/lib/merchant-verification"

test("light onboarding is the default and does not gate selling on verification status", () => {
	const previous = process.env.MERCHANT_ONBOARDING_MODE
	try {
		delete process.env.MERCHANT_ONBOARDING_MODE
		assert.equal(getMerchantOnboardingMode(), "LIGHT")
		for (const status of ["NOT_STARTED", "IN_PROGRESS", "PENDING_REVIEW", "REJECTED", "SUSPENDED"] as const) assert.equal(canMerchantSell(status), true)
	} finally {
		if (previous === undefined) delete process.env.MERCHANT_ONBOARDING_MODE
		else process.env.MERCHANT_ONBOARDING_MODE = previous
	}
})

test("strict onboarding restores the approval gate", () => {
	const previous = process.env.MERCHANT_ONBOARDING_MODE
	try {
		process.env.MERCHANT_ONBOARDING_MODE = "VERIFICATION_REQUIRED"
		assert.equal(getMerchantOnboardingMode(), "VERIFICATION_REQUIRED")
		assert.equal(canMerchantSell("APPROVED"), true)
		assert.equal(canMerchantSell("NOT_STARTED"), false)
		assert.equal(canMerchantSell("REJECTED"), false)
	} finally {
		if (previous === undefined) delete process.env.MERCHANT_ONBOARDING_MODE
		else process.env.MERCHANT_ONBOARDING_MODE = previous
	}
})

test("unrecognized onboarding mode safely falls back to light onboarding", () => {
	const previous = process.env.MERCHANT_ONBOARDING_MODE
	try {
		process.env.MERCHANT_ONBOARDING_MODE = "unknown"
		assert.equal(getMerchantOnboardingMode(), "LIGHT")
	} finally {
		if (previous === undefined) delete process.env.MERCHANT_ONBOARDING_MODE
		else process.env.MERCHANT_ONBOARDING_MODE = previous
	}
})
