import { test } from "node:test"
import assert from "node:assert/strict"
import { mapMpesaQueryStatus } from "../../backend/payments/mpesa"
import { ORDER_STATUS_TRANSITIONS } from "../../backend/services/order.service"
import { calculatePaidOrderRate, csvCell } from "../../backend/services/analytics.service"
import { hashEmailVerificationCode, matchesEmailVerificationCode } from "../../backend/lib/email-verification"
import { hashPasswordResetToken, passwordResetIdentifier, emailFromPasswordResetIdentifier } from "../../backend/lib/password-reset-token"

test("M-Pesa verification fails closed when the provider omits a result code", () => {
	assert.deepEqual(mapMpesaQueryStatus({ ResponseCode: "0" }), { status: "PENDING", completed: false, pending: true })
	assert.equal(mapMpesaQueryStatus({ ResponseCode: "0", ResultCode: 0 }).status, "COMPLETED")
	assert.equal(mapMpesaQueryStatus({ ResponseCode: "1032", ResultCode: 1032 }).status, "FAILED")
})

test("order transition matrix prevents backwards terminal workflow changes", () => {
	assert.equal(ORDER_STATUS_TRANSITIONS.PENDING.includes("CONFIRMED"), true)
	assert.equal(ORDER_STATUS_TRANSITIONS.DELIVERED.includes("PENDING"), false)
	assert.equal(ORDER_STATUS_TRANSITIONS.CANCELLED.length, 0)
})

test("analytics CSV cells quote and neutralize spreadsheet formulas", () => {
	assert.equal(csvCell("=SUM(A1:A2)"), '"\'=SUM(A1:A2)"')
	assert.equal(csvCell("A,\"B\""), '"A,""B"""')
})

test("analytics paid-order rate uses eligible orders as its denominator", () => {
	assert.equal(calculatePaidOrderRate(1, 4), 25)
	assert.equal(calculatePaidOrderRate(0, 4), 0)
	assert.equal(calculatePaidOrderRate(2, 0), 0)
})

test("email verification codes are stored as hashes and compare in constant time", () => {
	const stored = hashEmailVerificationCode("123456")
	assert.notEqual(stored, "123456")
	assert.equal(matchesEmailVerificationCode(stored, "123456"), true)
	assert.equal(matchesEmailVerificationCode(stored, "654321"), false)
})

test("password reset tokens are hashed and use a namespaced identifier", () => {
	const token = "a".repeat(64)
	const hash = hashPasswordResetToken(token)
	assert.notEqual(hash, token)
	assert.equal(hashPasswordResetToken(token), hash)
	const identifier = passwordResetIdentifier("person@example.com")
	assert.equal(emailFromPasswordResetIdentifier(identifier), "person@example.com")
})
