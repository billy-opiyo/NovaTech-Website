import prisma from "../../lib/db"
import Stripe from "stripe"
import { sendOrderConfirmationEmail } from "../../lib/email"
import { getStripeClient, getStripeWebhookSecret } from "../../lib/stripeClient"
import { isMpesaConfigured } from "../../lib/daraja"
import type { Prisma } from "@prisma/client"
import type {
	MpesaStkCallbackPayload,
	MpesaC2BPayload,
	WebhookResult,
} from "../../types/payments"
import { cancelPendingOrder } from "../../services/order.service"

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
	if (eventId) {
		try {
			await prisma.webhookReceipt.create({ data: { provider: "stripe", eventId } })
		} catch (error: any) {
			if (error?.code === "P2002") return { ok: true, received: true, provider: "stripe", event: type, receivedAt, message: "Duplicate Stripe event acknowledged." }
			throw error
		}
	}
	const data = payload.data as { object?: Record<string, unknown> } | undefined
	const paymentIntentId =
		(data?.object?.id as string) ||
		(payload.payment_intent as string) ||
		""

	let paymentStatus: "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED" | null =
		null

	switch (type) {
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
		await updatePaymentByProviderReference(paymentIntentId, paymentStatus)
	}

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
}

export async function handleMpesaStkCallback(
	payload: MpesaStkCallbackPayload,
): Promise<WebhookResult> {
	const receivedAt = new Date().toISOString()
	const stkCallback = payload?.Body?.stkCallback

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
): Promise<WebhookResult> {
	const receivedAt = new Date().toISOString()

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
) {
	if (!providerReference) return null

	try {
		const payment = await prisma.payment.findFirst({
			where: {
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

		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status,
				...(extra.phoneNumber ? { phoneNumber: extra.phoneNumber } : {}),
				...(extra.amount ? { amount: extra.amount } : {}),
				metadata: newMetadata,
			},
		})

		if (payment.orderId && status === "COMPLETED") {
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

		return payment
	} catch (error) {
		// Webhook handlers must always acknowledge the provider even if the
		// local DB lookup/update fails (otherwise providers retry endlessly).
		console.error(
			`Webhook DB update failed for ${providerReference}:`,
			error,
		)
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
