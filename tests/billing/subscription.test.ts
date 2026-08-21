import { test } from "node:test"
import assert from "node:assert/strict"
import { assertSubscriptionTransition, canTransitionSubscription } from "../../backend/billing/subscription"
import { lifecycleDecision } from "../../backend/billing/lifecycle"
import { retentionDueAt } from "../../backend/retention/tenant-retention"

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
