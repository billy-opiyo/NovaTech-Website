import prisma from "../../lib/db"
import Stripe from "stripe"
import { sendOrderConfirmationEmail } from "../../lib/email"
import { getStripeClient, getStripeWebhookSecret } from "../../lib/stripeClient"
import { isMpesaConfigured, stkQuery } from "../../lib/daraja"
import type { Prisma } from "@prisma/client"
import type {
	MpesaStkCallbackPayload,
	MpesaC2BPayload,
	WebhookResult,
} from "../../types/payments"
import { cancelPendingOrder } from "../../services/order.service"
import { applyStripeCheckoutCompleted, applyStripeInvoiceEvent, applyStripeSubscriptionEvent, markBillingPaymentFromMpesa, recordOrderCommission } from "../../billing/service"
import { z } from "zod"

const mpesaStkCallbackSchema = z.object({
	Body: z.object({
		stkCallback: z.object({
			MerchantRequestID: z.string().min(1),
			CheckoutRequestID: z.string().min(1),
			ResultCode: z.number().int(),
			ResultDesc: z.string().min(1),
			CallbackMetadata: z.object({ Item: z.array(z.object({ Name: z.string().min(1), Value: z.union([z.string(), z.number()]).optional() })) }).optional(),
		}),
	}),
})

const mpesaC2bSchema = z.object({
	TransactionType: z.string().min(1),
	TransID: z.string().min(1),
	TransTime: z.string().min(1),
	TransAmount: z.number().finite().positive(),
	BusinessShortCode: z.string().min(1),
	BillRefNumber: z.string().min(1),
	InvoiceNumber: z.string().min(1).optional(),
	OrgAccountBalance: z.number().finite().optional(),
	ThirdPartyTransID: z.string().min(1).optional(),
	MSISDN: z.string().min(1),
	FirstName: z.string().min(1),
	MiddleName: z.string().optional(),
	LastName: z.string().optional(),
})

const mpesaQueryResponseSchema = z.object({
	ResponseCode: z.string(),
	ResultCode: z.number().int().optional(),
})

export type WebhookEvent = {
	provider: string
	event: string
	payload: Record<string, unknown>
	receivedAt: string
}

// Re-export for backward compatibility with existing API surface
export async function handleWebhook(
	event: WebhookEvent,
): Promise<WebhookResult> {
	const receivedAt = new Date().toISOString()

	if (event.provider === "stripe") {
		return handleStripeEvent(event.payload, receivedAt)
	}

	if (event.provider === "mpesa") {
		if (event.event === "stk-callback") {
			await handleMpesaStkCallback(
				event.payload as unknown as MpesaStkCallbackPayload,
			)
		} else if (event.event === "c2b") {
			await handleMpesaC2B(
				event.payload as unknown as MpesaC2BPayload,
			)
		}
	}

	return {
		ok: true,
		received: true,
		provider: event.provider as "stripe" | "mpesa",
		event: event.event,
		receivedAt,
	}
}

export async function handleStripeEvent(
	payload: Record<string, unknown>,
	receivedAt = new Date().toISOString(),
): Promise<WebhookResult> {
	const type = String(payload.type || "unknown")
	const eventId = String(payload.id || "")
	let receiptId: string | undefined
	if (eventId) {
		const existing = await prisma.webhookReceipt.findUnique({ where: { provider_eventId: { provider: "stripe", eventId } } })
		if (existing?.status === "PROCESSED") return { ok: true, received: true, provider: "stripe", event: type, receivedAt, message: "Duplicate Stripe event acknowledged." }
		if (existing?.status === "PROCESSING" && Date.now() - existing.receivedAt.getTime() < 5 * 60 * 1000) return { ok: true, received: true, provider: "stripe", event: type, receivedAt, message: "Stripe event is already being processed." }
		if (existing) {
			const processing = await prisma.webhookReceipt.update({ where: { id: existing.id }, data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null } })
			receiptId = processing.id
		} else {
			try {
				const created = await prisma.webhookReceipt.create({ data: { provider: "stripe", eventId, status: "PROCESSING", attempts: 1 } })
				receiptId = created.id
			} catch (error: any) {
				if (error?.code !== "P2002") throw error
				const concurrent = await prisma.webhookReceipt.findUnique({ where: { provider_eventId: { provider: "stripe", eventId } } })
				if (concurrent?.status === "PROCESSED" || concurrent?.status === "PROCESSING") return { ok: true, received: true, provider: "stripe", event: type, receivedAt, message: "Duplicate Stripe event acknowledged." }
				if (!concurrent) throw error
				const retry = await prisma.webhookReceipt.update({ where: { id: concurrent.id }, data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null } })
				receiptId = retry.id
			}
		}
	}
	try {
	const data = payload.data as { object?: Record<string, unknown> } | undefined
	const paymentIntentId =
		(type === "charge.refunded" ? (data?.object?.payment_intent as string) : (data?.object?.id as string)) ||
		(payload.payment_intent as string) ||
		""

	let paymentStatus: "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED" | null =
		null

	switch (type) {
		case "checkout.session.completed":
			await applyStripeCheckoutCompleted(data?.object || {})
			break
		case "customer.subscription.created":
		case "customer.subscription.updated":
		case "customer.subscription.deleted":
			await applyStripeSubscriptionEvent(data?.object || {})
			break
		case "invoice.paid":
			await applyStripeInvoiceEvent(data?.object || {}, true)
			break
		case "invoice.payment_failed":
			await applyStripeInvoiceEvent(data?.object || {}, false, true)
			break
		case "payment_intent.succeeded":
			paymentStatus = "COMPLETED"
			break
		case "payment_intent.payment_failed":
			paymentStatus = "FAILED"
			break
		case "payment_intent.canceled":
			paymentStatus = "CANCELLED"
			break
		case "charge.refunded":
			paymentStatus = "REFUNDED"
			break
	}

	if (paymentStatus && paymentIntentId) {
		await updatePaymentByProviderReference(paymentIntentId, paymentStatus, {}, "stripe")
	}

	if (receiptId) await prisma.webhookReceipt.update({ where: { id: receiptId }, data: { status: "PROCESSED", processedAt: new Date(), lastError: null } })
	return {
		ok: true,
		received: true,
		provider: "stripe",
		event: type,
		receivedAt,
		message: paymentStatus
			? `Stripe event ${type} processed -> ${paymentStatus}`
			: `Stripe event ${type} received but no payment status mapping.`,
	}
	} catch (error) {
		if (receiptId) await prisma.webhookReceipt.update({ where: { id: receiptId }, data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Webhook processing failed" } }).catch(() => undefined)
		throw error
	}
}

export async function handleMpesaStkCallback(
	payload: MpesaStkCallbackPayload,
	options: { strictReconciliation?: boolean } = {},
): Promise<WebhookResult> {
	const receivedAt = new Date().toISOString()
	const parsed = mpesaStkCallbackSchema.safeParse(payload)
	if (!parsed.success) {
		return { ok: false, received: false, provider: "mpesa", event: "stk-callback", receivedAt, message: "Invalid STK callback payload." }
	}
	const stkCallback = parsed.data.Body.stkCallback

	if (!stkCallback) {
		return {
			ok: false,
			received: false,
			provider: "mpesa",
			event: "stk-callback",
			receivedAt,
			message: "Invalid STK callback payload.",
		}
	}

	const checkoutRequestId = stkCallback.CheckoutRequestID
	const resultCode = stkCallback.ResultCode
	const completed = resultCode === 0
	if (completed && isMpesaConfigured()) {
		const providerCheck = mpesaQueryResponseSchema.safeParse(await stkQuery({ checkoutRequestId }))
		if (!providerCheck.success || providerCheck.data.ResponseCode !== "0" || providerCheck.data.ResultCode !== 0) return { ok: false, received: false, provider: "mpesa", event: "stk-callback", receivedAt, message: "M-Pesa callback could not be confirmed with the provider." }
	}

	const metadataItems = stkCallback.CallbackMetadata?.Item || []
	const mpesaReceiptNumber = metadataItems.find(
		(item) => item.Name === "MpesaReceiptNumber",
	)?.Value as string | undefined
	const phone = metadataItems.find(
		(item) => item.Name === "PhoneNumber",
	)?.Value as string | undefined
	const amount = metadataItems.find(
		(item) => item.Name === "Amount",
	)?.Value as number | undefined

	await updatePaymentByProviderReference(
		checkoutRequestId,
		completed ? "COMPLETED" : "FAILED",
		{
			mpesaReceiptNumber,
			phoneNumber: phone,
			amount,
			metadata: {
				resultCode,
				resultDesc: stkCallback.ResultDesc,
				merchantRequestId: stkCallback.MerchantRequestID,
			},
		},
		"mpesa",
		options.strictReconciliation,
	)

	return {
		ok: completed,
		received: true,
		provider: "mpesa",
		event: "stk-callback",
		receivedAt,
		message: completed
			? `STK payment confirmed. Receipt: ${mpesaReceiptNumber}`
			: `STK payment failed: ${stkCallback.ResultDesc}`,
	}
}

export async function handleMpesaC2B(
	payload: MpesaC2BPayload,
	options: { strictReconciliation?: boolean } = {},
): Promise<WebhookResult> {
	const receivedAt = new Date().toISOString()
	const parsed = mpesaC2bSchema.safeParse(payload)
	if (!parsed.success) return { ok: false, received: false, provider: "mpesa", event: "c2b", receivedAt, message: "Invalid C2B callback payload." }
	payload = parsed.data
	if (process.env.MPESA_SHORTCODE && payload.BusinessShortCode !== process.env.MPESA_SHORTCODE) return { ok: false, received: false, provider: "mpesa", event: "c2b", receivedAt, message: "C2B callback business shortcode does not match configuration." }

	const reference =
		payload.BillRefNumber ||
		payload.InvoiceNumber ||
		payload.ThirdPartyTransID ||
		""

	if (reference) {
		await updatePaymentByProviderReference(
			reference,
			"COMPLETED",
			{
				phoneNumber: payload.MSISDN,
				amount: payload.TransAmount,
				metadata: {
					transId: payload.TransID,
					transTime: payload.TransTime,
					transactionType: payload.TransactionType,
				},
			},
			"mpesa",
			options.strictReconciliation,
		)
	}

	return {
		ok: true,
		received: true,
		provider: "mpesa",
		event: "c2b",
		receivedAt,
		message: `C2B transaction ${payload.TransID} confirmed.`,
	}
}

type UpdatePaymentData = {
	mpesaReceiptNumber?: string
	phoneNumber?: string
	amount?: number
	metadata?: Record<string, unknown>
}

export function paymentOrderBelongsToTenant(paymentTenantId: string | null | undefined, orderTenantId: string | null | undefined) {
	return Boolean(paymentTenantId && orderTenantId && paymentTenantId === orderTenantId)
}

async function updatePaymentByProviderReference(
	providerReference: string,
	status: "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED",
	extra: UpdatePaymentData = {},
	provider?: "mpesa" | "stripe",
	throwOnDatabaseError = false,
) {
	if (!providerReference) return null

	try {
		const payment = await prisma.payment.findFirst({
			where: {
				...(provider ? { provider } : {}),
				OR: [
					{ providerReference },
					{ metadata: { path: ["reference"], equals: providerReference } },
				],
			},
		})

	if (!payment) return null
	if (payment.status === status || (payment.status === "COMPLETED" && status !== "REFUNDED")) return payment
		if (extra.amount !== undefined && Math.abs(payment.amount - extra.amount) > 0.01) {
			console.error(`Webhook amount mismatch for ${providerReference}`)
			return null
		}

		if (payment.orderId) {
			const order = await prisma.order.findFirst({ where: { id: payment.orderId }, select: { tenantId: true } })
			if (!paymentOrderBelongsToTenant(payment.tenantId, order?.tenantId)) {
				console.error(`Webhook tenant mismatch or missing tenant for ${providerReference}`)
				return null
			}
		}

		const existingMetadata =
			payment.metadata as Prisma.InputJsonValue | undefined

		const newMetadata: Prisma.InputJsonValue = {
			...(existingMetadata as Record<string, unknown> | undefined),
			...(extra.mpesaReceiptNumber
				? { mpesaReceiptNumber: extra.mpesaReceiptNumber }
				: {}),
			...(extra.metadata || {}),
		}

		const updatedPayment = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status,
				...(extra.phoneNumber ? { phoneNumber: extra.phoneNumber } : {}),
				...(extra.amount ? { amount: extra.amount } : {}),
				metadata: newMetadata,
			},
		})
		if (payment.kind !== "ORDER") await markBillingPaymentFromMpesa({ id: updatedPayment.id, status, invoiceId: updatedPayment.invoiceId, subscriptionId: updatedPayment.subscriptionId, billingRecordId: updatedPayment.billingRecordId, failureReason: extra.metadata?.resultDesc as string | undefined })

		if (payment.orderId && status === "COMPLETED") {
			await recordOrderCommission(payment.id)
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
		if (payment.orderId && status !== "COMPLETED") await cancelPendingOrder(payment.orderId, payment.tenantId || undefined)

		return updatedPayment
	} catch (error) {
		// Public M-Pesa routes opt into a retryable response when reconciliation
		// fails. Legacy callers retain the non-throwing contract for compatibility.
		console.error(
			`Webhook DB update failed for ${providerReference}:`,
			error,
		)
		if (throwOnDatabaseError) throw error
		return null
	}
}

export function verifyStripeWebhookSignature(
	rawBody: string,
	signature: string,
):
	| { ok: false; error: string }
	| { ok: true; event: Stripe.Event } {
	const secret = getStripeWebhookSecret()
	if (!secret) {
		return { ok: false, error: "STRIPE_WEBHOOK_SECRET is not configured" }
	}

	try {
		const stripe = getStripeClient()
		const event = stripe.webhooks.constructEvent(rawBody, signature, secret)
		return { ok: true, event }
	} catch (error: any) {
		return { ok: false, error: error.message }
	}
}

export function isAnyPaymentProviderConfigured(): boolean {
	return isMpesaConfigured() || Boolean(getStripeWebhookSecret())
}
