import { test } from "node:test"
import assert from "node:assert/strict"
import { assertSubscriptionTransition, canTransitionSubscription } from "../../backend/billing/subscription"

test("subscription lifecycle allows recovery and cancellation paths", () => {
	assert.equal(canTransitionSubscription("TRIALING", "ACTIVE"), true)
	assert.equal(canTransitionSubscription("PAST_DUE", "GRACE_PERIOD"), true)
	assert.equal(canTransitionSubscription("GRACE_PERIOD", "ACTIVE"), true)
	assert.equal(canTransitionSubscription("CANCELLED", "ACTIVE"), false)
	assert.throws(() => assertSubscriptionTransition("CANCELLED", "ACTIVE"), /Invalid subscription transition/)
})
