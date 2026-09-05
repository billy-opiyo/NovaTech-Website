const dayMilliseconds = 24 * 60 * 60 * 1000

/**
 * MVP billing policy (approved on saas-staging):
 * - New stores start on a six-month free "Founding Merchant" pilot using the
 *   Starter-plan limits. No payment is required during store creation and no
 *   charge happens automatically.
 * - After the pilot ends, a 14-day grace period begins with reminders.
 * - If no plan is paid for during the grace period, the public storefront is
 *   paused while merchant data and workspace access remain preserved so the
 *   merchant can still choose and pay for a plan to restore full operation.
 */

export const MVP_PILOT_PLAN_KEY = "STARTER"

const configuredPilotDays = Number.parseInt(process.env.NURAVA_MVP_PILOT_DAYS || "", 10)
export const MVP_PILOT_DAYS = Number.isFinite(configuredPilotDays) && configuredPilotDays >= 1 ? configuredPilotDays : 180

export type PilotReminderStage =
	| "PILOT_ENDS_IN_14_DAYS"
	| "PILOT_ENDS_IN_7_DAYS"
	| "PILOT_ENDS_IN_1_DAY"
	| "GRACE_PERIOD_STARTED"
	| "GRACE_PERIOD_ENDING"

export function pilotTrialEndsAt(startsAt: Date) {
	return new Date(startsAt.getTime() + MVP_PILOT_DAYS * dayMilliseconds)
}

export function pilotReminderStage(trialEndsAt: Date, now: Date): PilotReminderStage | null {
	const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / dayMilliseconds)
	if (daysLeft < 0 || daysLeft > 14) return null
	if (daysLeft <= 1) return "PILOT_ENDS_IN_1_DAY"
	if (daysLeft <= 7) return "PILOT_ENDS_IN_7_DAYS"
	return "PILOT_ENDS_IN_14_DAYS"
}

export function graceReminderStage(gracePeriodEndsAt: Date, now: Date): Extract<PilotReminderStage, "GRACE_PERIOD_STARTED" | "GRACE_PERIOD_ENDING"> | null {
	const daysLeft = Math.ceil((gracePeriodEndsAt.getTime() - now.getTime()) / dayMilliseconds)
	if (daysLeft < 0 || daysLeft > 14) return null
	return daysLeft <= 3 ? "GRACE_PERIOD_ENDING" : "GRACE_PERIOD_STARTED"
}

export function pilotReminderNotificationType(stage: PilotReminderStage) {
	return `PILOT_REMINDER_${stage}`
}