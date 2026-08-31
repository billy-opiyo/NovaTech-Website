import prisma from "../lib/db"

export type SubscriptionLifecycle = "TRIALING" | "ACTIVE" | "PAST_DUE" | "GRACE_PERIOD" | "SUSPENDED" | "CANCELLED" | "INCOMPLETE" | "UNPAID"

const transitions: Record<SubscriptionLifecycle, SubscriptionLifecycle[]> = {
	TRIALING: ["ACTIVE", "PAST_DUE", "CANCELLED", "SUSPENDED"],
	ACTIVE: ["PAST_DUE", "CANCELLED", "SUSPENDED"],
	PAST_DUE: ["ACTIVE", "GRACE_PERIOD", "SUSPENDED", "UNPAID", "CANCELLED"],
	GRACE_PERIOD: ["ACTIVE", "SUSPENDED", "CANCELLED"],
	SUSPENDED: ["ACTIVE", "CANCELLED"],
	CANCELLED: [],
	INCOMPLETE: ["ACTIVE", "PAST_DUE", "UNPAID", "CANCELLED"],
	UNPAID: ["ACTIVE", "SUSPENDED", "CANCELLED"],
}

export function canTransitionSubscription(from: SubscriptionLifecycle, to: SubscriptionLifecycle) {
	return from === to || transitions[from].includes(to)
}

export function assertSubscriptionTransition(from: SubscriptionLifecycle, to: SubscriptionLifecycle) {
	if (!canTransitionSubscription(from, to)) throw new Error(`Invalid subscription transition: ${from} -> ${to}`)
}

export async function getTenantEntitlement(tenantId: string, featureKey: string, fallback: unknown = null) {
	const override = await prisma.featureEntitlement.findFirst({ where: { tenantId, featureKey, effectiveAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { effectiveAt: "desc" } })
	if (override) return override.value
	if (featureKey === "whatsappNotifications") {
		const addon = await prisma.addonSubscription.findFirst({ where: { tenantId, status: "ACTIVE", addon: { key: "whatsapp-notifications" } }, select: { id: true } })
		if (addon) return true
	}
	const subscription = await prisma.subscription.findFirst({ where: { tenantId, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE_PERIOD"] } }, orderBy: { createdAt: "desc" }, include: { plan: true } })
	const entitlements = subscription?.plan.entitlementsJson
	if (entitlements && typeof entitlements === "object" && !Array.isArray(entitlements) && featureKey in entitlements) return (entitlements as Record<string, unknown>)[featureKey]
	return fallback
}

export async function assertTenantLimit(tenantId: string, metric: string, requested: number, fallbackLimit: number) {
	const limitValue = await getTenantEntitlement(tenantId, metric, fallbackLimit)
	const limit = typeof limitValue === "number" ? limitValue : fallbackLimit
	const usage = await prisma.usageCounter.findFirst({ where: { tenantId, metric, periodStart: { lte: new Date() }, periodEnd: { gt: new Date() } } })
	if ((usage?.value || 0) + requested > limit) {
		const error = new Error(`The ${metric} limit has been reached`)
		Object.assign(error, { code: "ENTITLEMENT_LIMIT_REACHED", limit, usage: usage?.value || 0 })
		throw error
	}
}

export async function assertTenantProductLimit(tenantId: string, requested = 1) {
	const limitValue = await getTenantEntitlement(tenantId, "productLimit", 50)
	const limit = typeof limitValue === "number" ? limitValue : 50
	const usage = await prisma.product.count({ where: { tenantId } })
	if (usage + requested > limit) {
		const error = new Error(`This plan allows ${limit} active products. Upgrade to add more.`)
		Object.assign(error, { code: "ENTITLEMENT_LIMIT_REACHED", metric: "productLimit", limit, usage })
		throw error
	}
}

export async function assertTenantStaffLimit(tenantId: string, requested = 1) {
	const limitValue = await getTenantEntitlement(tenantId, "staffAccounts", 3)
	const limit = typeof limitValue === "number" ? limitValue : 3
	const [activeMemberships, pendingInvitations] = await Promise.all([
		prisma.membership.count({ where: { tenantId, active: true } }),
		prisma.invitation.count({ where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } } }),
	])
	const usage = activeMemberships + pendingInvitations
	if (usage + requested > limit) {
		const error = new Error(`This plan allows ${limit} staff accounts. Upgrade to add more.`)
		Object.assign(error, { code: "ENTITLEMENT_LIMIT_REACHED", metric: "staffAccounts", limit, usage })
		throw error
	}
}

export async function assertTenantCustomDomainLimit(tenantId: string, requested = 1) {
	const enabled = await getTenantEntitlement(tenantId, "customDomain", false)
	if (enabled !== true) {
		const error = new Error("Custom domains are not included in this plan. Upgrade to add one.")
		Object.assign(error, { code: "ENTITLEMENT_FEATURE_NOT_INCLUDED", metric: "customDomain", status: 409 })
		throw error
	}
	const limitValue = await getTenantEntitlement(tenantId, "customDomainCount", 1)
	const limit = typeof limitValue === "number" ? limitValue : 1
	const usage = await prisma.domain.count({ where: { tenantId, type: "CUSTOM" } })
	if (usage + requested > limit) {
		const error = new Error(`This plan allows ${limit} custom domain${limit === 1 ? "" : "s"}. Upgrade to add more.`)
		Object.assign(error, { code: "ENTITLEMENT_LIMIT_REACHED", metric: "customDomainCount", limit, usage, status: 409 })
		throw error
	}
}

export async function assertTenantStorageLimit(tenantId: string, requestedBytes: number) {
	const limitValue = await getTenantEntitlement(tenantId, "storageGb", 2)
	const limitGb = typeof limitValue === "number" ? limitValue : 2
	const limitBytes = limitGb * 1024 * 1024 * 1024
	const usage = await prisma.storageAsset.aggregate({ where: { tenantId }, _sum: { bytes: true } })
	const usedBytes = usage._sum.bytes || 0
	if (usedBytes + requestedBytes > limitBytes) {
		const error = new Error(`This plan includes ${limitGb} GB of storage. Upgrade to add more files.`)
		Object.assign(error, { code: "ENTITLEMENT_LIMIT_REACHED", metric: "storageGb", limit: limitGb, usage: usedBytes, status: 409 })
		throw error
	}
}

export async function reserveTenantStorageAsset(input: { tenantId: string; storeId: string; objectKey: string; bytes: number; kind?: string }) {
	if (!Number.isInteger(input.bytes) || input.bytes < 1) throw new Error("Storage asset size is invalid")
	const limitValue = await getTenantEntitlement(input.tenantId, "storageGb", 2)
	const limitGb = typeof limitValue === "number" ? limitValue : 2
	const limitBytes = limitGb * 1024 * 1024 * 1024
	return prisma.$transaction(async (transaction) => {
		await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`storage:${input.tenantId}`}))`
		const usage = await transaction.storageAsset.aggregate({ where: { tenantId: input.tenantId }, _sum: { bytes: true } })
		const usedBytes = usage._sum.bytes || 0
		if (usedBytes + input.bytes > limitBytes) {
			const error = new Error(`This plan includes ${limitGb} GB of storage. Upgrade to add more files.`)
			Object.assign(error, { code: "ENTITLEMENT_LIMIT_REACHED", metric: "storageGb", limit: limitGb, usage: usedBytes, status: 409 })
			throw error
		}
		return transaction.storageAsset.create({ data: { tenantId: input.tenantId, storeId: input.storeId, objectKey: input.objectKey, bytes: input.bytes, kind: input.kind || "STORE_ASSET" } })
	})
}
