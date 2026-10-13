import type { PaymentStatus } from "@prisma/client"
import prisma from "../lib/db"
import { decryptMerchantPaymentDetails } from "../lib/merchant-verification-secrets"
import { isMerchantVerificationRequired } from "../lib/merchant-verification"
import { getNuravaShopperPaymentTestConfig } from "../lib/shopper-payment-test-mode"
import { normalizePhone } from "../lib/daraja"
import { recordOrderCommission } from "../billing/service"

function paymentError(message: string, status: number, code: string) {
	return Object.assign(new Error(message), { status, code })
}

function metadataObject(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export async function getManualShopperPaymentDestination(tenantId: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { id: tenantId },
		select: {
			verificationStatus: true,
			verificationProfile: { select: { settlementAccountType: true, sensitiveDetailsCiphertext: true } },
			store: { select: { slug: true } },
			shopperPaymentProfile: { select: { accountType: true, shortcode: true, accountName: true, status: true, verifiedAt: true, credentialsCiphertext: true } },
		},
	})
	if (!tenant || getNuravaShopperPaymentTestConfig(tenant.store?.slug)) return null
	const profile = tenant.shopperPaymentProfile
	if (!profile || profile.accountType !== "PHONE" || !["CONFIGURED", "ACTIVE"].includes(profile.status)) return null
	if (isMerchantVerificationRequired()) {
		if (profile.status !== "ACTIVE" || !profile.verifiedAt || tenant.verificationStatus !== "APPROVED" || tenant.verificationProfile?.settlementAccountType !== "PHONE") return null
		try {
			const details = decryptMerchantPaymentDetails(tenant.verificationProfile.sensitiveDetailsCiphertext)
			if (normalizePhone(details.settlementAccountNumber || "") !== normalizePhone(profile.shortcode)) return null
		} catch { return null }
	}
	try {
		const credentials = decryptMerchantPaymentDetails(profile.credentialsCiphertext)
		if (credentials.paymentMode !== "MANUAL_PHONE_TRANSFER") return null
	} catch { return null }
	return { phone: profile.shortcode, accountName: profile.accountName || "" }
}

export async function createManualShopperPayment(input: { tenantId: string; orderId: string; phone: string }) {
	const destination = await getManualShopperPaymentDestination(input.tenantId)
	if (!destination) throw paymentError("This store has not configured an active registered M-Pesa phone for shopper payments.", 409, "MERCHANT_MANUAL_MPESA_NOT_READY")
	const order = await prisma.order.findFirst({ where: { id: input.orderId, tenantId: input.tenantId }, select: { id: true, total: true, status: true, paymentMethod: true } })
	if (!order || order.paymentMethod !== "MPESA" || order.status !== "PENDING") throw paymentError("This order is not awaiting M-Pesa payment.", 409, "ORDER_NOT_PAYABLE")
	if (!Number.isFinite(order.total) || order.total <= 0) throw paymentError("The order has an invalid payable total.", 409, "INVALID_ORDER_TOTAL")
	const existing = await prisma.payment.findFirst({
		where: { tenantId: input.tenantId, orderId: order.id, provider: "mpesa-manual", kind: "ORDER", status: { in: ["PENDING", "PROCESSING"] } },
		orderBy: { createdAt: "desc" },
	})
	if (existing) {
		const metadata = metadataObject(existing.metadata)
		if (metadata.manualMode !== "PHONE_TRANSFER" || Math.abs(existing.amount - order.total) > 0.01) throw paymentError("A different payment is already pending for this order. Contact the store before retrying.", 409, "ORDER_PAYMENT_CONFLICT")
		return { paymentId: existing.id, amount: existing.amount, currency: existing.currency, phone: String((metadata.manualDestination as { phone?: unknown } | undefined)?.phone || destination.phone), accountName: String((metadata.manualDestination as { accountName?: unknown } | undefined)?.accountName || destination.accountName), status: existing.status }
	}
	const payment = await prisma.payment.create({
		data: {
			tenantId: input.tenantId,
			orderId: order.id,
			provider: "mpesa-manual",
			amount: order.total,
			currency: "KES",
			status: "PENDING",
			kind: "ORDER",
			phoneNumber: input.phone,
			metadata: { reference: `ORD-${order.id}`, manualMode: "PHONE_TRANSFER", manualDestination: destination },
		},
	})
	return { paymentId: payment.id, amount: payment.amount, currency: payment.currency, ...destination, status: payment.status }
}

export async function submitManualShopperReceipt(input: { tenantId: string; orderId: string; paymentId: string; receiptCode: string }) {
	const receiptCode = input.receiptCode.trim().toUpperCase()
	if (!/^[A-Z0-9]{8,12}$/.test(receiptCode)) throw paymentError("Enter the M-Pesa receipt code shown in your confirmation message.", 400, "INVALID_MPESA_RECEIPT")
	const payment = await prisma.payment.findFirst({ where: { id: input.paymentId, tenantId: input.tenantId, orderId: input.orderId, provider: "mpesa-manual", kind: "ORDER" } })
	if (!payment || payment.status !== "PENDING" || payment.providerReference) throw paymentError("This order is no longer awaiting a receipt.", 409, "MANUAL_PAYMENT_NOT_PENDING")
	if (metadataObject(payment.metadata).manualMode !== "PHONE_TRANSFER") throw paymentError("This payment is not a registered-phone transfer.", 409, "MANUAL_PAYMENT_MODE_MISMATCH")
	const duplicate = await prisma.payment.findUnique({ where: { providerReference: receiptCode }, select: { id: true } })
	if (duplicate) throw paymentError("That M-Pesa receipt code has already been submitted.", 409, "DUPLICATE_MPESA_RECEIPT")
	try {
		const result = await prisma.payment.updateMany({
			where: { id: payment.id, tenantId: input.tenantId, status: "PENDING", providerReference: null },
			data: { providerReference: receiptCode, status: "PROCESSING", metadata: { ...metadataObject(payment.metadata), manualReceiptCode: receiptCode, manualReceiptSubmittedAt: new Date().toISOString() } },
		})
		if (!result.count) throw paymentError("This receipt was already submitted. Refresh and check its status.", 409, "MANUAL_RECEIPT_ALREADY_SUBMITTED")
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw paymentError("That M-Pesa receipt code has already been submitted.", 409, "DUPLICATE_MPESA_RECEIPT")
		throw error
	}
	return { paymentId: payment.id, status: "PROCESSING" as PaymentStatus, message: "Receipt submitted. The store will verify it before confirming your order." }
}

export async function listManualShopperReceipts(tenantId: string) {
	const payments = await prisma.payment.findMany({
		where: { tenantId, provider: "mpesa-manual", kind: "ORDER", status: "PROCESSING" },
		orderBy: { createdAt: "asc" },
		take: 100,
		select: { id: true, orderId: true, amount: true, currency: true, providerReference: true, phoneNumber: true, createdAt: true, metadata: true, order: { select: { id: true, status: true, shippingAddress: true, total: true } } },
	})
	return payments.filter((payment) => metadataObject(payment.metadata).manualMode === "PHONE_TRANSFER")
}

export async function reviewManualShopperReceipt(input: { tenantId: string; paymentId: string; reviewerId: string; approve: boolean; note?: string }) {
	const payment = await prisma.payment.findFirst({ where: { id: input.paymentId, tenantId: input.tenantId, provider: "mpesa-manual", kind: "ORDER" } })
	if (!payment || !payment.orderId) throw paymentError("Manual shopper payment not found.", 404, "MANUAL_PAYMENT_NOT_FOUND")
	const metadata = metadataObject(payment.metadata)
	if (metadata.manualMode !== "PHONE_TRANSFER" || !payment.providerReference || metadata.manualReceiptCode !== payment.providerReference) throw paymentError("This payment has no submitted M-Pesa receipt to review.", 409, "MANUAL_RECEIPT_NOT_SUBMITTED")
	if (payment.status !== "PROCESSING") throw paymentError("This receipt has already been reviewed.", 409, "MANUAL_RECEIPT_ALREADY_REVIEWED")
	const reviewedAt = new Date().toISOString()
	if (!input.approve) {
		const rejected = await prisma.payment.updateMany({
			where: { id: payment.id, tenantId: input.tenantId, status: "PROCESSING", provider: "mpesa-manual" },
			data: { status: "FAILED", failureReason: input.note?.slice(0, 500) || "Merchant could not verify the M-Pesa receipt", metadata: { ...metadata, manualReviewStatus: "REJECTED", manualReviewedAt: reviewedAt, manualReviewedBy: input.reviewerId, manualReviewNote: input.note?.slice(0, 500) || null } },
		})
		if (!rejected.count) throw paymentError("This receipt has already been reviewed.", 409, "MANUAL_RECEIPT_ALREADY_REVIEWED")
		return { paymentId: payment.id, status: "FAILED" as const, message: "Receipt rejected. The shopper may submit a new payment." }
	}
	const settlement = await prisma.$transaction(async (tx) => {
		const reviewMetadata = { ...metadata, manualReviewStatus: "APPROVED", manualReviewedAt: reviewedAt, manualReviewedBy: input.reviewerId, manualReviewNote: input.note?.slice(0, 500) || null }
		const claimed = await tx.payment.updateMany({ where: { id: payment.id, tenantId: input.tenantId, status: "PROCESSING", provider: "mpesa-manual" }, data: { status: "COMPLETED", metadata: reviewMetadata } })
		if (!claimed.count) throw paymentError("This receipt has already been reviewed.", 409, "MANUAL_RECEIPT_ALREADY_REVIEWED")
		const changedOrder = await tx.order.updateMany({ where: { id: payment.orderId!, tenantId: input.tenantId, status: "PENDING" }, data: { status: "CONFIRMED" } })
		const order = await tx.order.findFirst({ where: { id: payment.orderId!, tenantId: input.tenantId }, select: { status: true } })
		if (!order) throw paymentError("The payment order is no longer available.", 404, "ORDER_NOT_FOUND")
		const refundRequired = changedOrder.count !== 1 && order.status === "CANCELLED"
		const reviewRequired = changedOrder.count !== 1 && order.status === "PENDING"
		const orderSettlement = refundRequired ? "REFUND_REQUIRED_ORDER_CANCELLED" : reviewRequired ? "REVIEW_REQUIRED" : "ORDER_CONFIRMED"
		await tx.payment.update({ where: { id: payment.id }, data: { metadata: { ...reviewMetadata, orderSettlement } } })
		return { refundRequired, reviewRequired }
	})
	await recordOrderCommission(payment.id)
	return { paymentId: payment.id, status: "COMPLETED" as const, refundRequired: settlement.refundRequired, reviewRequired: settlement.reviewRequired, message: settlement.refundRequired ? "Payment verified, but the order is cancelled and requires refund handling." : settlement.reviewRequired ? "Payment verified, but the order requires review." : "Receipt verified and order confirmed." }
}
