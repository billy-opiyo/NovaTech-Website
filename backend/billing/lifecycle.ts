import prisma from "../lib/db"
import { retentionDueAt } from "../retention/tenant-retention"
import type { SubscriptionStatus } from "@prisma/client"

export const ACCESS_GRACE_PERIOD_DAYS = 3
const dayMilliseconds = 24 * 60 * 60 * 1000

type LifecycleSnapshot = {
	status: SubscriptionStatus
	trialEndsAt: Date | null
	currentPeriodEnd: Date | null
	gracePeriodEndsAt: Date | null
	cancelAtPeriodEnd: boolean
}

export function lifecycleDecision(subscription: LifecycleSnapshot, now: Date) {
	if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= now) return { subscriptionStatus: "CANCELLED" as const, tenantStatus: "CANCELLED" as const, retentionStartsAt: subscription.currentPeriodEnd }
	if (subscription.status === "TRIALING" && subscription.trialEndsAt && subscription.trialEndsAt <= now) {
		const graceEndsAt = new Date(subscription.trialEndsAt.getTime() + ACCESS_GRACE_PERIOD_DAYS * dayMilliseconds)
		return graceEndsAt > now ? { subscriptionStatus: "GRACE_PERIOD" as const, tenantStatus: "GRACE_PERIOD" as const, gracePeriodEndsAt: graceEndsAt } : { subscriptionStatus: "SUSPENDED" as const, tenantStatus: "SUSPENDED" as const, gracePeriodEndsAt: graceEndsAt, retentionStartsAt: graceEndsAt }
	}
	if ((subscription.status === "ACTIVE" || subscription.status === "PAST_DUE") && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= now) {
		const graceEndsAt = subscription.gracePeriodEndsAt || new Date(subscription.currentPeriodEnd.getTime() + ACCESS_GRACE_PERIOD_DAYS * dayMilliseconds)
		if (graceEndsAt > now) return { subscriptionStatus: subscription.status === "ACTIVE" ? "PAST_DUE" as const : "GRACE_PERIOD" as const, tenantStatus: subscription.status === "ACTIVE" ? "PAST_DUE" as const : "GRACE_PERIOD" as const, gracePeriodEndsAt: graceEndsAt }
		return { subscriptionStatus: "SUSPENDED" as const, tenantStatus: "SUSPENDED" as const, gracePeriodEndsAt: graceEndsAt, retentionStartsAt: graceEndsAt }
	}
	if (subscription.status === "GRACE_PERIOD" && subscription.gracePeriodEndsAt && subscription.gracePeriodEndsAt <= now) return { subscriptionStatus: "SUSPENDED" as const, tenantStatus: "SUSPENDED" as const, retentionStartsAt: subscription.gracePeriodEndsAt }
	return null
}

export async function runSubscriptionLifecycleSweep(now = new Date(), limit = 100) {
	const subscriptions = await prisma.subscription.findMany({ where: { status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE_PERIOD"] } }, orderBy: { updatedAt: "asc" }, take: Math.min(Math.max(limit, 1), 200), select: { id: true, tenantId: true, status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true, cancelAtPeriodEnd: true, tenant: { select: { status: true, store: { select: { id: true, publicationStatus: true } } } } } })
	const results: Array<{ subscriptionId: string; changed: boolean; error?: string }> = []
	for (const subscription of subscriptions) {
		const decision = lifecycleDecision(subscription, now)
		if (!decision) {
			results.push({ subscriptionId: subscription.id, changed: false })
			continue
		}
		try {
			await prisma.$transaction(async (transaction) => {
				await transaction.subscription.update({ where: { id: subscription.id }, data: { status: decision.subscriptionStatus, gracePeriodEndsAt: decision.gracePeriodEndsAt || undefined } })
				const tenantStatus = subscription.tenant.status === "SUSPENDED" && decision.tenantStatus !== "SUSPENDED" ? undefined : decision.tenantStatus
				await transaction.tenant.update({ where: { id: subscription.tenantId }, data: { ...(tenantStatus ? { status: tenantStatus } : {}), ...(decision.retentionStartsAt ? { dataRetentionStartsAt: decision.retentionStartsAt, dataDeletionDueAt: retentionDueAt(decision.retentionStartsAt) } : {}) } })
				if (subscription.tenant.store && ["SUSPENDED", "CANCELLED"].includes(decision.tenantStatus)) await transaction.store.update({ where: { id: subscription.tenant.store.id }, data: { publicationStatus: "SUSPENDED" } })
			})
			results.push({ subscriptionId: subscription.id, changed: true })
		} catch (error: any) {
			console.error("Subscription lifecycle processing failed", { subscriptionId: subscription.id, message: error.message })
			results.push({ subscriptionId: subscription.id, changed: false, error: "LIFECYCLE_PROCESSING_FAILED" })
		}
	}
	return { scanned: subscriptions.length, changed: results.filter((item) => item.changed).length, results }
}
