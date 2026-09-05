import { test } from "node:test"
import assert from "node:assert/strict"
import { MVP_PILOT_DAYS, MVP_PILOT_PLAN_KEY, graceReminderStage, pilotReminderStage, pilotReminderNotificationType, pilotTrialEndsAt } from "../../backend/billing/mvp-policy"

test("new stores receive a six-month free pilot on the Starter plan", () => {
	assert.equal(MVP_PILOT_PLAN_KEY, "STARTER")
	assert.equal(MVP_PILOT_DAYS, 180)
	const startedAt = new Date("2026-08-21T00:00:00.000Z")
	assert.equal(pilotTrialEndsAt(startedAt).toISOString(), "2027-02-17T00:00:00.000Z")
})

test("pilot reminders fire at 14, 7, and 1 day before the pilot ends", () => {
	const now = new Date("2026-08-21T00:00:00.000Z")
	const day = 24 * 60 * 60 * 1000
	assert.equal(pilotReminderStage(new Date(now.getTime() + 14 * day), now), "PILOT_ENDS_IN_14_DAYS")
	assert.equal(pilotReminderStage(new Date(now.getTime() + 7 * day), now), "PILOT_ENDS_IN_7_DAYS")
	assert.equal(pilotReminderStage(new Date(now.getTime() + day), now), "PILOT_ENDS_IN_1_DAY")
	assert.equal(pilotReminderStage(new Date(now.getTime() + 20 * day), now), null)
	assert.equal(pilotReminderStage(new Date(now.getTime() - day), now), null)
})

test("grace reminders distinguish the start and final days of the grace period", () => {
	const now = new Date("2026-08-21T00:00:00.000Z")
	const day = 24 * 60 * 60 * 1000
	assert.equal(graceReminderStage(new Date(now.getTime() + 14 * day), now), "GRACE_PERIOD_STARTED")
	assert.equal(graceReminderStage(new Date(now.getTime() + 3 * day), now), "GRACE_PERIOD_ENDING")
	assert.equal(graceReminderStage(new Date(now.getTime() + 20 * day), now), null)
	assert.equal(graceReminderStage(new Date(now.getTime() - day), now), null)
	assert.equal(pilotReminderNotificationType("PILOT_ENDS_IN_7_DAYS"), "PILOT_REMINDER_PILOT_ENDS_IN_7_DAYS")
})