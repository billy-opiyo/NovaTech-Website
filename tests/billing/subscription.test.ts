import { test } from "node:test"
import assert from "node:assert/strict"
import { assertSubscriptionTransition, canTransitionSubscription } from "../../backend/billing/subscription"
import { lifecycleDecision } from "../../backend/billing/lifecycle"
import { retentionDueAt } from "../../backend/retention/tenant-retention"
import { calculateInclusiveVat, calculateSaasInvoiceTotals, setupFeeRefundPolicy } from "../../backend/billing/policy"
import { calculateServiceCreditAmount } from "../../backend/billing/credits"

test("subscription lifecycle allows recovery and cancellation paths", () => {
	assert.equal(canTransitionSubscription("TRIALING", "ACTIVE"), true)
	assert.equal(canTransitionSubscription("PAST_DUE", "GRACE_PERIOD"), true)
	assert.equal(canTransitionSubscription("GRACE_PERIOD", "ACTIVE"), true)
	assert.equal(canTransitionSubscription("CANCELLED", "ACTIVE"), false)
	assert.throws(() => assertSubscriptionTransition("CANCELLED", "ACTIVE"), /Invalid subscription transition/)
})

test("subscription lifecycle worker applies the configured three-day grace period", () => {
	const now = new Date("2026-08-21T00:00:00.000Z")
	const trialEnded = lifecycleDecision({ status: "TRIALING", trialEndsAt: new Date("2026-08-20T00:00:00.000Z"), currentPeriodEnd: null, gracePeriodEndsAt: null, cancelAtPeriodEnd: false }, now)
	assert.equal(trialEnded?.subscriptionStatus, "GRACE_PERIOD")
	assert.equal(trialEnded?.tenantStatus, "GRACE_PERIOD")
	assert.equal(trialEnded?.gracePeriodEndsAt?.toISOString(), "2026-08-23T00:00:00.000Z")
	const suspended = lifecycleDecision({ status: "GRACE_PERIOD", trialEndsAt: null, currentPeriodEnd: null, gracePeriodEndsAt: new Date("2026-08-20T00:00:00.000Z"), cancelAtPeriodEnd: false }, now)
	assert.equal(suspended?.subscriptionStatus, "SUSPENDED")
	assert.equal(suspended?.retentionStartsAt?.toISOString(), "2026-08-20T00:00:00.000Z")
})

test("tenant retention due date is ninety days after access ends", () => {
	assert.equal(retentionDueAt(new Date("2026-01-01T00:00:00.000Z")).toISOString(), "2026-04-01T00:00:00.000Z")
})

test("VAT-inclusive SaaS totals preserve the advertised gross price", () => {
	assert.deepEqual(calculateInclusiveVat(1500, 16), { grossAmount: 1500, netAmount: 1293, taxAmount: 207 })
	assert.deepEqual(calculateSaasInvoiceTotals({ subscription: 1500, addons: 350, setupFee: 5000, vatRate: 16 }), { grossAmount: 6850, netAmount: 5905, taxAmount: 945, vatRate: 16 })
})

test("setup fee is refundable only before setup work starts when provisioning fails", () => {
	assert.equal(setupFeeRefundPolicy(false, true), true)
	assert.equal(setupFeeRefundPolicy(true, true), false)
	assert.equal(setupFeeRefundPolicy(false, false), false)
})

test("service credits start at 24 hours and cap at one monthly subscription", () => {
	const start = new Date("2026-01-01T00:00:00.000Z")
	assert.equal(calculateServiceCreditAmount(1500, start, new Date("2026-01-01T23:59:59.000Z")), 0)
	assert.equal(calculateServiceCreditAmount(1500, start, new Date("2026-01-02T00:00:00.000Z")), 50)
	assert.equal(calculateServiceCreditAmount(1500, start, new Date("2026-02-15T00:00:00.000Z")), 1500)
})
