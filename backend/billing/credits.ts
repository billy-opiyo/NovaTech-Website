import { Prisma } from "@prisma/client"
import prisma from "../lib/db"

export const SERVICE_CREDIT_THRESHOLD_HOURS = 24
export const SERVICE_CREDIT_CAP_MONTHS = 1
const dayMilliseconds = 24 * 60 * 60 * 1000

const paidStatuses = ["ACTIVE", "PAST_DUE", "GRACE_PERIOD"] as const

export function calculateServiceCreditAmount(monthlySubscription: number, startedAt: Date, endedAt: Date) {
	if (!Number.isFinite(monthlySubscription) || monthlySubscription < 0 || endedAt <= startedAt) return 0
	const completeDays = Math.floor((endedAt.getTime() - startedAt.getTime()) / dayMilliseconds)
	if (completeDays < SERVICE_CREDIT_THRESHOLD_HOURS / 24) return 0
	return Math.min(monthlySubscription * SERVICE_CREDIT_CAP_MONTHS, Math.round(monthlySubscription * completeDays / 30))
}

export async function issueServiceCreditsForVerifiedOutage(input: { incidentKey: string; startedAt: Date; endedAt: Date; verified: boolean; corePlatformOutage: boolean }) {
	if (!input.verified || !input.corePlatformOutage) return { issued: 0, amount: 0, reason: "OUTAGE_NOT_ELIGIBLE" as const }
	const subscriptions = await prisma.subscription.findMany({ where: { status: { in: [...paidStatuses] } }, orderBy: { createdAt: "desc" }, include: { plan: { select: { price: true, currency: true } } } })
	const tenants = new Map<string, { monthlySubscription: number; currency: string }>()
	for (const subscription of subscriptions) {
		if (!tenants.has(subscription.tenantId)) tenants.set(subscription.tenantId, { monthlySubscription: subscription.plan.price || 0, currency: subscription.plan.currency })
	}
	const rows = [...tenants.entries()].map(([tenantId, plan]) => ({
		tenantId,
		sourceKey: `${input.incidentKey}:${tenantId}`,
		amount: calculateServiceCreditAmount(plan.monthlySubscription, input.startedAt, input.endedAt),
		remainingAmount: calculateServiceCreditAmount(plan.monthlySubscription, input.startedAt, input.endedAt),
		currency: plan.currency,
		reason: "VERIFIED_CORE_PLATFORM_OUTAGE",
		outageStartedAt: input.startedAt,
		outageEndedAt: input.endedAt,
	}))
		.filter((row) => row.amount > 0)
	if (!rows.length) return { issued: 0, amount: 0, reason: "NO_ELIGIBLE_PAID_TENANTS" as const }
	const created = await prisma.billingCredit.createMany({ data: rows, skipDuplicates: true })
	return { issued: created.count, amount: rows.reduce((total, row) => total + row.amount, 0), reason: "ISSUED" as const }
}

export async function reserveBillingCredits(transaction: Prisma.TransactionClient, tenantId: string, currency: string, amount: number, invoiceId: string) {
	if (amount <= 0) return 0
	const available = await transaction.billingCredit.findMany({ where: { tenantId, currency, status: "AVAILABLE", remainingAmount: { gt: 0 } }, orderBy: { issuedAt: "asc" } })
	let remaining = amount
	let reserved = 0
	for (const credit of available) {
		if (remaining <= 0) break
		const use = Math.min(remaining, credit.remainingAmount)
		const updated = await transaction.billingCredit.updateMany({ where: { id: credit.id, status: "AVAILABLE", remainingAmount: credit.remainingAmount }, data: { remainingAmount: { decrement: use }, status: credit.remainingAmount === use ? "EXHAUSTED" : "AVAILABLE" } })
		if (!updated.count) continue
		await transaction.invoiceCreditApplication.create({ data: { invoiceId, creditId: credit.id, amount: use } })
		reserved += use
		remaining -= use
	}
	return reserved
}

export async function finalizeInvoiceCredits(invoiceId: string) {
	return prisma.$transaction(async (transaction) => {
		const applications = await transaction.invoiceCreditApplication.findMany({ where: { invoiceId, status: "RESERVED" }, select: { id: true, creditId: true } })
		if (!applications.length) return 0
		await transaction.invoiceCreditApplication.updateMany({ where: { id: { in: applications.map((item) => item.id) } }, data: { status: "APPLIED", appliedAt: new Date() } })
		return applications.length
	})
}

export async function releaseInvoiceCredits(invoiceId: string) {
	return prisma.$transaction(async (transaction) => {
		const applications = await transaction.invoiceCreditApplication.findMany({ where: { invoiceId, status: "RESERVED" }, select: { id: true, creditId: true, amount: true } })
		for (const application of applications) {
			await transaction.billingCredit.update({ where: { id: application.creditId }, data: { remainingAmount: { increment: application.amount }, status: "AVAILABLE" } })
		}
		if (applications.length) await transaction.invoiceCreditApplication.updateMany({ where: { id: { in: applications.map((item) => item.id) } }, data: { status: "RELEASED", releasedAt: new Date() } })
		return applications.length
	})
}
