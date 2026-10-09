import { test } from "node:test"
import assert from "node:assert/strict"
import { calculateCommission, stripeAmount } from "../../backend/billing/service"

test("transaction commission is calculated and rounded from the configured rate", () => {
	assert.equal(calculateCommission(1234.56, 2.5), 30.86)
	assert.equal(calculateCommission(1000, 0), 0)
})

test("transaction commission rejects invalid rates", () => {
	assert.throws(() => calculateCommission(1000, 101), /Commission percentage/)
	assert.throws(() => calculateCommission(-1, 2), /Gross amount/)
})

test("Stripe billing minor units are explicit and limited to KES", () => {
	assert.equal(stripeAmount(1234, "KES"), 123400)
	assert.throws(() => stripeAmount(100, "JPY"), /supports KES only/)
	assert.throws(() => stripeAmount(100, "USD"), /supports KES only/)
})
