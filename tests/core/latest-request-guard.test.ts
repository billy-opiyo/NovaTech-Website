import { test } from "node:test"
import assert from "node:assert/strict"
import { createLatestRequestGuard } from "../../frontend/src/lib/latest-request-guard"

test("latest request guard ignores older responses after a newer request begins", () => {
	const guard = createLatestRequestGuard()
	const earlierRequest = guard.begin()
	const currentRequest = guard.begin()

	assert.equal(guard.isCurrent(earlierRequest), false)
	assert.equal(guard.isCurrent(currentRequest), true)
})

test("latest request guard invalidates results after filter cleanup or unmount", () => {
	const guard = createLatestRequestGuard()
	const request = guard.begin()

	guard.invalidate()

	assert.equal(guard.isCurrent(request), false)
})
