import prisma from "../lib/db"
import { deletePrivateFile } from "../lib/storage"

export const TENANT_DATA_RETENTION_DAYS = 90
const dayMilliseconds = 24 * 60 * 60 * 1000

export function retentionDueAt(startsAt: Date, retentionDays = TENANT_DATA_RETENTION_DAYS) {
	return new Date(startsAt.getTime() + retentionDays * dayMilliseconds)
}

export async function scheduleTenantDataRetention(tenantId: string, startsAt: Date) {
	return prisma.tenant.update({ where: { id: tenantId }, data: { dataRetentionStartsAt: startsAt, dataDeletionDueAt: retentionDueAt(startsAt) }, select: { id: true, dataRetentionStartsAt: true, dataDeletionDueAt: true } })
}

async function deleteMerchantData(tenantId: string) {
	await prisma.$transaction(async (transaction) => {
		await transaction.merchantVerificationProfile.deleteMany({ where: { tenantId } })
		await transaction.merchantVerificationEvidence.deleteMany({ where: { tenantId } })
		await transaction.ticketReply.deleteMany({ where: { tenantId } })
		await transaction.supportTicket.deleteMany({ where: { tenantId } })
		await transaction.notification.deleteMany({ where: { tenantId } })
		await transaction.review.deleteMany({ where: { tenantId } })
		await transaction.wishlistItem.deleteMany({ where: { tenantId } })
		await transaction.recentlyViewed.deleteMany({ where: { tenantId } })
		await transaction.cartItem.deleteMany({ where: { tenantId } })
		await transaction.address.deleteMany({ where: { tenantId } })
		await transaction.deliveryRegion.deleteMany({ where: { tenantId } })
		await transaction.coupon.deleteMany({ where: { tenantId } })
		await transaction.orderItem.deleteMany({ where: { tenantId } })
		await transaction.payment.deleteMany({ where: { tenantId, kind: "ORDER" } })
		await transaction.transaction.deleteMany({ where: { tenantId } })
		await transaction.order.deleteMany({ where: { tenantId } })
		await transaction.variant.deleteMany({ where: { tenantId } })
		await transaction.product.deleteMany({ where: { tenantId } })
		await transaction.category.updateMany({ where: { tenantId }, data: { parentId: null } })
		await transaction.category.deleteMany({ where: { tenantId } })
		await transaction.store.deleteMany({ where: { tenantId } })
		await transaction.membership.deleteMany({ where: { tenantId } })
		await transaction.invitation.deleteMany({ where: { tenantId } })
		await transaction.featureEntitlement.deleteMany({ where: { tenantId } })
		await transaction.tenant.update({ where: { id: tenantId }, data: { status: "DELETED", deletedAt: new Date(), dataDeletedAt: new Date() } })
	})
}

export async function processTenantRetention(tenantId: string, now = new Date()) {
	const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, dataDeletedAt: null, dataDeletionDueAt: { lte: now } }, select: { id: true, verificationEvidence: { select: { objectKey: true } } } })
	if (!tenant) return { tenantId, processed: false, reason: "NOT_DUE_OR_ALREADY_PROCESSED" as const }

	// Evidence objects are deleted before database rows. If private storage is
	// unavailable, no merchant rows are scrubbed and the next run can retry.
	for (const evidence of tenant.verificationEvidence) await deletePrivateFile(evidence.objectKey)
	await deleteMerchantData(tenant.id)
	return { tenantId, processed: true, deletedEvidence: tenant.verificationEvidence.length }
}

export async function runTenantRetentionSweep(now = new Date(), limit = 50) {
	const tenants = await prisma.tenant.findMany({ where: { dataDeletedAt: null, dataDeletionDueAt: { lte: now } }, orderBy: { dataDeletionDueAt: "asc" }, take: Math.min(Math.max(limit, 1), 100), select: { id: true } })
	const results: Array<{ tenantId: string; processed: boolean; reason?: string; deletedEvidence?: number; error?: string }> = []
	for (const tenant of tenants) {
		try {
			results.push(await processTenantRetention(tenant.id, now))
		} catch (error: any) {
			console.error("Tenant retention processing failed", { tenantId: tenant.id, message: error.message })
			results.push({ tenantId: tenant.id, processed: false, error: "RETENTION_PROCESSING_FAILED" })
		}
	}
	return { scanned: tenants.length, processed: results.filter((item) => item.processed).length, results }
}
