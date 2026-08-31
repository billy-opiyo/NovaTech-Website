import prisma from "../../lib/db"
import { z } from "zod"
import type { BillingPaymentKind } from "@prisma/client"
import { sendOrderConfirmationEmail } from "../../lib/email"
import {
	isMpesaConfigured,
	normalizePhone,
	stkPush,
	stkQuery,
	generatePassword,
} from "../../lib/daraja"
import type {
	MpesaInitiateResult,
	MpesaVerifyResult,
} from "../../types/payments"
import { cancelPendingOrder } from "../../services/order.service"

export type MpesaPayload = {
	amount: number
	phone: string
	reference: string
	tenantId?: string
	orderId?: string
	metadata?: Record<string, unknown>
	invoiceId?: string
	subscriptionId?: string
	billingRecordId?: string
	kind?: BillingPaymentKind
}

export interface MpesaInitiateInput extends MpesaPayload {
	callbackUrl?: string
	paymentId?: string
}

const mpesaInitiateResponseSchema = z.object({
	MerchantRequestID: z.string().min(1),
	CheckoutRequestID: z.string().min(1),
	ResponseCode: z.string(),
	ResponseDescription: z.string().optional(),
	CustomerMessage: z.string().optional(),
})

const mpesaQueryResponseSchema = z.object({
	ResponseCode: z.string(),
	ResponseDescription: z.string().optional(),
	ResultCode: z.number().int().optional(),
	ResultDesc: z.string().optional(),
})

export function mapMpesaQueryStatus(response: { ResponseCode: string; ResultCode?: number }) {
	const completed = response.ResponseCode === "0" && response.ResultCode === 0
	const pending = response.ResponseCode === "0" && (response.ResultCode === 4999 || response.ResultCode === undefined)
	return { status: completed ? "COMPLETED" as const : pending ? "PENDING" as const : "FAILED" as const, completed, pending }
}

export async function initiateMpesaPayment({
	amount,
	phone,
	reference,
	tenantId,
	orderId,
	metadata,
	invoiceId,
	subscriptionId,
	billingRecordId,
	kind = "ORDER",
	callbackUrl,
	paymentId,
}: MpesaInitiateInput): Promise<MpesaInitiateResult> {
	if (!isMpesaConfigured()) {
		return {
			ok: false,
			provider: "mpesa",
			reference,
			checkoutRequestId: "",
			phone,
			amount,
			currency: "KES",
			status: "FAILED",
			message:
				"M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY and MPESA_SHORTCODE.",
		}
	}

	if (amount <= 0) {
		throw new Error("Amount must be greater than zero")
	}

	if (orderId) {
		const order = await prisma.order.findFirst({ where: { id: orderId, ...(tenantId ? { tenantId } : {}) }, select: { total: true, status: true } })
		if (!order) throw new Error("Order not found")
		if (order.status !== "PENDING") throw new Error("Order is no longer payable")
		if (Math.abs(order.total - amount) > 0.01) throw new Error("Payment amount does not match the order")
		amount = order.total
	}

	const existing = paymentId
		? await prisma.payment.findFirst({ where: { id: paymentId, provider: "mpesa", ...(tenantId ? { tenantId } : {}) } })
		: await prisma.payment.findFirst({
				where: { provider: "mpesa", ...(tenantId ? { tenantId } : {}), metadata: { path: ["reference"], equals: reference } },
			})
	if (existing) {
		if (paymentId && !existing.providerReference) {
			const claimed = await prisma.payment.updateMany({ where: { id: existing.id, status: "PENDING", providerReference: null }, data: { status: "PROCESSING" } })
			if (!claimed.count) {
				return {
					ok: existing.status !== "FAILED" && existing.status !== "CANCELLED",
					provider: "mpesa",
					reference,
					checkoutRequestId: existing.providerReference || "",
					phone: existing.phoneNumber || phone,
					amount: existing.amount,
					currency: existing.currency,
					status: existing.status === "PROCESSING" ? "PENDING" : existing.status,
					message: "An M-Pesa request is already being initiated.",
				}
			}
		} else {
		const metadata = (existing.metadata || {}) as Record<string, unknown>
		return {
			ok: existing.status !== "FAILED" && existing.status !== "CANCELLED",
			provider: "mpesa",
			reference,
			checkoutRequestId: existing.providerReference || "",
			phone: existing.phoneNumber || phone,
			amount: existing.amount,
			currency: existing.currency,
			status: existing.status,
			message: "Existing M-Pesa request returned for this order.",
			metadata: { paymentId: existing.id, merchantRequestId: metadata.merchantRequestId },
		}
		}
	}

	const normalizedPhone = normalizePhone(phone)

	const callback =
		callbackUrl ||
		`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/webhooks/mpesa/stk-callback`

	let response: z.infer<typeof mpesaInitiateResponseSchema>
	try {
		response = mpesaInitiateResponseSchema.parse(await stkPush({
			amount,
			phone: normalizedPhone,
			accountReference: reference.slice(0, 12),
			callbackUrl: callback,
		}))
	} catch (error) {
		if (existing && paymentId) await prisma.payment.update({ where: { id: existing.id }, data: { status: "FAILED", failureReason: "M-Pesa initiation failed" } }).catch(() => undefined)
		throw error
	}

	const status = response.ResponseCode === "0" ? "PENDING" : "FAILED"
	const payment = existing && paymentId
		? await prisma.payment.update({
				where: { id: existing.id },
				data: {
					status,
					providerReference: response.CheckoutRequestID,
					phoneNumber: normalizedPhone,
					failureReason: response.ResponseCode === "0" ? null : response.ResponseDescription || response.CustomerMessage || "M-Pesa request rejected",
					metadata: { ...((existing.metadata || {}) as Record<string, unknown>), merchantRequestId: response.MerchantRequestID },
				},
			})
		: await prisma.payment.create({
		data: {
			tenantId,
			orderId,
			provider: "mpesa",
			amount,
			currency: "KES",
			status,
			invoiceId,
			subscriptionId,
			billingRecordId,
			kind,
			providerReference: response.CheckoutRequestID,
			phoneNumber: normalizedPhone,
			metadata: {
				reference,
				merchantRequestId: response.MerchantRequestID,
				...(metadata || {}),
			},
		},
		})
	return {
		ok: response.ResponseCode === "0",
		provider: "mpesa",
		reference,
		checkoutRequestId: response.CheckoutRequestID,
		merchantRequestId: response.MerchantRequestID,
		phone: normalizedPhone,
		amount,
		currency: "KES",
		status,
		message: response.ResponseDescription || response.CustomerMessage,
		metadata: {
			paymentId: payment.id,
			responseCode: response.ResponseCode,
		},
	}
}

export async function verifyMpesaPayment(
	reference: string,
	tenantId?: string,
): Promise<MpesaVerifyResult> {
	if (!isMpesaConfigured()) {
		return {
			ok: false,
			provider: "mpesa",
			reference,
			status: "FAILED",
			checkoutRequestId: reference,
			message:
				"M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY and MPESA_SHORTCODE.",
		}
	}

	const payment = await prisma.payment.findFirst({
		where: {
			...(tenantId ? { tenantId } : {}),
			OR: [
				{ providerReference: reference },
				{ metadata: { path: ["reference"], equals: reference } },
			],
		},
	})

	const checkoutRequestId = payment?.providerReference || reference

	const responseResult = mpesaQueryResponseSchema.safeParse(await stkQuery({ checkoutRequestId }))
	if (!responseResult.success) {
		return { ok: false, provider: "mpesa", reference, checkoutRequestId, status: "PENDING", message: "M-Pesa returned an incomplete verification response. Please retry." }
	}
	const response = responseResult.data

	const resultCode = response.ResultCode
	const { status: queriedStatus, completed, pending } = mapMpesaQueryStatus(response)

	const status = payment?.status === "COMPLETED" && queriedStatus !== "COMPLETED" ? "COMPLETED" : queriedStatus

	if (payment) {
		await prisma.payment.update({ where: { id: payment.id }, data: { status, metadata: { ...(payment.metadata as Record<string, unknown> | undefined), verifyResponseCode: response.ResponseCode, ...(resultCode === undefined ? {} : { verifyResultCode: resultCode }), verifyResultDesc: response.ResultDesc } } })

		if (status === "COMPLETED" && payment.orderId && payment.status !== "COMPLETED") {
			const order = await prisma.order.findFirst({ where: { id: payment.orderId, ...(tenantId || payment.tenantId ? { tenantId: tenantId || payment.tenantId! } : {}) }, select: { id: true } })
			if (!order) return { ok: false, provider: "mpesa", reference, status: "FAILED", checkoutRequestId, message: "Payment order is not available in this store." }
			const updatedOrder = await prisma.order.update({
				where: { id: payment.orderId },
				data: { status: "CONFIRMED" },
				include: {
					items: {
						include: {
							product: {
								select: {
									name: true,
									slug: true,
									images: true,
								},
							},
						},
					},
				},
			})

			// Send order confirmation email (non-blocking)
			try {
				const email = updatedOrder.userId
					? (
							await prisma.user.findUnique({
								where: { id: updatedOrder.userId },
								select: { email: true },
							})
						)?.email
					: (updatedOrder.shippingAddress as any)?.email

				if (email) {
					await sendOrderConfirmationEmail(email, updatedOrder)
				}
			} catch (emailError) {
				console.error("Failed to send order confirmation email:", emailError)
			}
		}
	}
	if (status === "FAILED" && payment?.orderId && payment.status !== "COMPLETED") await cancelPendingOrder(payment.orderId, payment.tenantId || undefined)

	return {
		ok: status === "COMPLETED" || status === "PENDING",
		provider: "mpesa",
		reference,
		checkoutRequestId,
		status,
		resultCode,
		resultDescription: response.ResultDesc || response.ResponseDescription,
		message: status === "COMPLETED"
			? "M-Pesa payment completed successfully."
			: pending
			? "M-Pesa payment is still being processed."
			: `M-Pesa payment failed: ${response.ResultDesc || response.ResponseDescription}`,
	}
}

export async function simulateMpesaPayment({
	amount,
	phone,
	reference,
}: MpesaPayload): Promise<{
	ok: boolean
	provider: "mpesa"
	message: string
}> {
	if (!isMpesaConfigured()) {
		return {
			ok: false,
			provider: "mpesa",
			message: "M-Pesa sandbox simulation requires M-Pesa credentials.",
		}
	}

	const { c2bSimulate } = await import("../../lib/daraja")
	await c2bSimulate({
		amount,
		phone,
		accountReference: reference.slice(0, 12),
	})

	return {
		ok: true,
		provider: "mpesa",
		message: "M-Pesa payment simulation triggered successfully.",
	}
}

export function generateTimestamp(): string {
	const { timestamp } = generatePassword(
		process.env.MPESA_SHORTCODE || "174379",
		process.env.MPESA_PASSKEY || "",
	)
	return timestamp
}
