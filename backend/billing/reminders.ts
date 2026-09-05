import prisma from "../lib/db"
import { PLATFORM_BRAND_NAME } from "../lib/brand"
import { emailWasAccepted, sendEmail } from "../lib/email"
import { escapeHtml } from "../lib/html"
import { graceReminderStage, pilotReminderStage, pilotReminderNotificationType, type PilotReminderStage } from "./mvp-policy"

const dayMilliseconds = 24 * 60 * 60 * 1000
const reminderLookaheadDays = 15

const stageCopy: Record<PilotReminderStage, { subject: string; heading: string; body: string }> = {
	PILOT_ENDS_IN_14_DAYS: {
		subject: `Your ${PLATFORM_BRAND_NAME} free pilot ends in 14 days`,
		heading: "Your free pilot ends in 14 days",
		body: "Your Founding Merchant pilot for {store} ends on {date}. No payment is due now and nothing is charged automatically. When the pilot ends, choose and pay for a plan from your billing page to keep your store running.",
	},
	PILOT_ENDS_IN_7_DAYS: {
		subject: `Your ${PLATFORM_BRAND_NAME} free pilot ends in 7 days`,
		heading: "Your free pilot ends in 7 days",
		body: "Your Founding Merchant pilot for {store} ends on {date}. No payment is due now and nothing is charged automatically. When the pilot ends, choose and pay for a plan from your billing page to keep your store running.",
	},
	PILOT_ENDS_IN_1_DAY: {
		subject: `Your ${PLATFORM_BRAND_NAME} free pilot ends tomorrow`,
		heading: "Your free pilot ends tomorrow",
		body: "Your Founding Merchant pilot for {store} ends on {date}. Nothing is charged automatically. After the pilot, a 14-day grace period keeps your store available while you choose and pay for a plan from your billing page.",
	},
	GRACE_PERIOD_STARTED: {
		subject: `Your ${PLATFORM_BRAND_NAME} grace period is active`,
		heading: "Your grace period is active",
		body: "Your free pilot for {store} has ended. A 14-day grace period is active until {date}, and your store stays available during this time. To keep the storefront running after it ends, choose and pay for a plan from your billing page. Nothing is charged automatically.",
	},
	GRACE_PERIOD_ENDING: {
		subject: `Your ${PLATFORM_BRAND_NAME} grace period ends in a few days`,
		heading: "Your grace period ends soon",
		body: "The grace period for {store} ends on {date}. After it ends, the public storefront is paused while your data and workspace remain available. Choose and pay for a plan from your billing page to restore full operation.",
	},
}

type ReminderSubscription = {
	id: string
	tenantId: string
	trialEndsAt: Date | null
	gracePeriodEndsAt: Date | null
	tenant: {
		store: { name: string } | null
		memberships: Array<{ user: { email: string; name: string | null } }>
	}
}

function reminderHtml(heading: string, message: string, billingUrl: string) {
	return `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><div style="background:linear-gradient(135deg,#0070f3,#f97316);padding:24px;text-align:center;border-radius:12px 12px 0 0;"><h1 style="color:#fff;margin:0;font-size:20px;">${escapeHtml(PLATFORM_BRAND_NAME)}</h1></div><div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;color:#1f2937;"><h2 style="margin-top:0;">${escapeHtml(heading)}</h2><p style="color:#4b5563;line-height:1.6;">${escapeHtml(message)}</p><a href="${billingUrl}" style="display:inline-block;background:#0070f3;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Open billing</a></div></div>`
}

async function dispatchReminder(subscription: ReminderSubscription, stage: PilotReminderStage, dueDate: Date) {
	const type = pilotReminderNotificationType(stage)
	const existing = await prisma.notification.findFirst({ where: { tenantId: subscription.tenantId, type }, select: { id: true } })
	if (existing) return false
	const storeName = subscription.tenant.store?.name || "your store"
	const copy = stageCopy[stage]
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
	const message = copy.body.split("{store}").join(storeName).split("{date}").join(dueDate.toLocaleDateString())
	let delivered = 0
	for (const membership of subscription.tenant.memberships) {
		if (!membership.user?.email) continue
		try {
			const result = await sendEmail({ to: membership.user.email, subject: copy.subject, html: reminderHtml(copy.heading, message, `${appUrl}/manage/billing`) })
			if (emailWasAccepted(result)) delivered += 1
		} catch (error) {
			console.error("Pilot reminder email failed", { tenantId: subscription.tenantId, stage, message: error instanceof Error ? error.message : String(error) })
		}
	}
	if (!delivered) return false
	await prisma.notification.create({ data: { tenantId: subscription.tenantId, type, message } })
	return true
}

export async function runPilotReminderSweep(now = new Date(), limit = 100) {
	const lookaheadEnd = new Date(now.getTime() + reminderLookaheadDays * dayMilliseconds)
	const subscriptions = await prisma.subscription.findMany({
		where: {
			OR: [
				{ status: "TRIALING", trialEndsAt: { gte: now, lte: lookaheadEnd }, tenant: { status: "TRIALING" } },
				{ status: "GRACE_PERIOD", gracePeriodEndsAt: { gte: now, lte: lookaheadEnd }, tenant: { status: "GRACE_PERIOD" } },
			],
		},
		select: {
			id: true,
			tenantId: true,
			status: true,
			trialEndsAt: true,
			gracePeriodEndsAt: true,
			tenant: { select: { store: { select: { name: true } }, memberships: { where: { role: "STORE_OWNER", active: true }, select: { user: { select: { email: true, name: true } } } } } },
		},
		orderBy: { updatedAt: "asc" },
		take: Math.min(Math.max(limit, 1), 200),
	})
	let sent = 0
	let errors = 0
	for (const subscription of subscriptions) {
		const dueDate = subscription.status === "TRIALING" ? subscription.trialEndsAt : subscription.gracePeriodEndsAt
		if (!dueDate) continue
		const stage = subscription.status === "TRIALING" ? pilotReminderStage(dueDate, now) : graceReminderStage(dueDate, now)
		if (!stage) continue
		try {
			const dispatched = await dispatchReminder(subscription as ReminderSubscription, stage, dueDate)
			if (dispatched) sent += 1
		} catch (error) {
			errors += 1
			console.error("Pilot reminder processing failed", { subscriptionId: subscription.id, message: error instanceof Error ? error.message : String(error) })
		}
	}
	return { scanned: subscriptions.length, sent, errors }
}
