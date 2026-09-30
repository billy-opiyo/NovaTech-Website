import prisma from "../lib/db"
import { PLATFORM_BRAND_NAME } from "../lib/brand"
import { emailWasAccepted, sendEmail } from "../lib/email"
import { escapeHtml } from "../lib/html"
import { sendWhatsAppMessage } from "../lib/whatsapp"
import { normalizePhone } from "../lib/daraja"
import { graceReminderStage, pilotReminderStage, pilotReminderNotificationType, type PilotReminderStage } from "./mvp-policy"

const dayMilliseconds = 24 * 60 * 60 * 1000
const reminderLookaheadDays = 15

const stageCopy: Record<PilotReminderStage, { subject: string; heading: string; body: string }> = {
	PILOT_ENDS_IN_14_DAYS: {
		subject: `Your ${PLATFORM_BRAND_NAME} six-month pilot ends in 14 days`,
		heading: "Your six-month pilot ends in 14 days",
		body: "The six-month pilot for {store} ends on {date}. Your selected plan's monthly subscription becomes payable then. You can request payment manually from your billing page; nothing is charged automatically.",
	},
	PILOT_ENDS_IN_7_DAYS: {
		subject: `Your ${PLATFORM_BRAND_NAME} six-month pilot ends in 7 days`,
		heading: "Your six-month pilot ends in 7 days",
		body: "The six-month pilot for {store} ends on {date}. Your selected plan's monthly subscription becomes payable then. You can request payment manually from your billing page; nothing is charged automatically.",
	},
	PILOT_ENDS_IN_1_DAY: {
		subject: `Your ${PLATFORM_BRAND_NAME} six-month pilot ends tomorrow`,
		heading: "Your six-month pilot ends tomorrow",
		body: "The pilot for {store} ends on {date}. A 14-day grace period then keeps your store available while you manually pay the selected plan's monthly subscription from your billing page. Nothing is charged automatically.",
	},
	GRACE_PERIOD_STARTED: {
		subject: `Your ${PLATFORM_BRAND_NAME} grace period is active`,
		heading: "Your grace period is active",
		body: "The pilot for {store} has ended. A 14-day grace period is active until {date}, and your store stays available during this time. Manually pay the selected plan's monthly subscription from your billing page to keep the storefront running. Nothing is charged automatically.",
	},
	GRACE_PERIOD_ENDING: {
		subject: `Your ${PLATFORM_BRAND_NAME} grace period ends in a few days`,
		heading: "Your grace period ends soon",
		body: "The grace period for {store} ends on {date}. If the monthly subscription remains unpaid, the public storefront will be paused while your data and workspace remain available. Pay manually from your billing page to restore full operation.",
	},
}

type ReminderSubscription = {
	id: string
	tenantId: string
	trialEndsAt: Date | null
	gracePeriodEndsAt: Date | null
	tenant: {
		store: { name: string; contactSettings: unknown } | null
		memberships: Array<{ user: { id: string; email: string; name: string | null } }>
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
		if (membership.user?.email) {
			try {
				const result = await sendEmail({ to: membership.user.email, subject: copy.subject, html: reminderHtml(copy.heading, message, `${appUrl}/manage/billing`) })
				if (emailWasAccepted(result)) delivered += 1
			} catch (error) {
				console.error("Pilot reminder email failed", { tenantId: subscription.tenantId, stage, message: error instanceof Error ? error.message : String(error) })
			}
		}
	}
	const contact = subscription.tenant.store?.contactSettings && typeof subscription.tenant.store.contactSettings === "object" && !Array.isArray(subscription.tenant.store.contactSettings)
		? subscription.tenant.store.contactSettings as Record<string, unknown>
		: {}
	const whatsappNumber = typeof contact.whatsappNumber === "string" ? contact.whatsappNumber : ""
	if (whatsappNumber && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
		try {
			await sendWhatsAppMessage({ to: normalizePhone(whatsappNumber), text: `${copy.heading}\n\n${message}\n\nRenew manually from: ${appUrl}/manage/billing` })
			delivered += 1
		} catch (error) {
			console.error("Pilot reminder WhatsApp failed", { tenantId: subscription.tenantId, stage, message: error instanceof Error ? error.message : String(error) })
		}
	}
	const owner = subscription.tenant.memberships[0]?.user
	if (!owner) return false
	await prisma.notification.create({ data: { tenantId: subscription.tenantId, userId: owner.id, type, message } })
	return delivered > 0 || Boolean(owner.email || whatsappNumber)
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
			tenant: { select: { store: { select: { name: true, contactSettings: true } }, memberships: { where: { role: "STORE_OWNER", active: true }, select: { user: { select: { id: true, email: true, name: true } } } } } },
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
