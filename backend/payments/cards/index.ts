import prisma from "../../lib/db"
import { sendOrderConfirmationEmail, shippingAddressEmail } from "../../lib/email"
import { getStripeClient, isStripeConfigured } from "../../lib/stripeClient"
import type { CardIntentResult, CardVerifyResult } from "../../types/payments"
import { cancelPendingOrder, confirmPendingOrder } from "../../services/order.service"
import { recordOrderCommission } from "../../billing/service"

export type CardPaymentPayload = {
	amount: number
	currency?: string
	customerEmail: string
	reference: string
	tenantId?: string
	orderId?: string
	metadata?: Record<string, unknown>
}

export async function createCardPaymentIntent({
	amount,
	currency = "KES",
	customerEmail,
	reference,
	tenantId,
	orderId,
	metadata,
}: CardPaymentPayload): Promise<CardIntentResult> {
	if (!isStripeConfigured()) {
		return {
			ok: false,
			provider: "stripe",
			reference,
			status: "FAILED",
			clientSecret: "",
			amount,
			currency,
			customerEmail,
			message:
				"Stripe is not configured. Set STRIPE_SECRET_KEY to enable card payments.",
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

	const existing = await prisma.payment.findFirst({
		where: { provider: "stripe", ...(tenantId ? { tenantId } : {}), metadata: { path: ["reference"], equals: reference } },
	})
	if (existing) {
		const metadata = (existing.metadata || {}) as Record<string, unknown>
		return {
			ok: existing.status !== "FAILED" && existing.status !== "CANCELLED",
			provider: "stripe",
			reference,
			clientSecret: String(metadata.clientSecret || ""),
			amount: existing.amount,
			currency: existing.currency,
			customerEmail: existing.customerEmail || customerEmail,
			status: existing.status,
			message: "Existing payment intent returned for this order.",
			metadata: { paymentId: existing.id, paymentIntentId: existing.providerReference },
		}
	}

	const stripe = getStripeClient()

	const paymentIntent = await stripe.paymentIntents.create({
		amount: Math.round(amount * 100),
		currency: currency.toLowerCase(),
		receipt_email: customerEmail,
		metadata: {
			reference,
			...(orderId ? { orderId } : {}),
			...(metadata || {}),
		},
	})

	const payment = await prisma.payment.create({
		data: {
			tenantId,
			orderId,
			provider: "stripe",
			amount,
			currency,
			status: "PENDING",
			providerReference: paymentIntent.id,
			customerEmail,
		metadata: {
				reference,
				clientSecret: paymentIntent.client_secret,
				...(metadata || {}),
			},
		},
	})

	return {
		ok: true,
		provider: "stripe",
		reference,
		clientSecret: paymentIntent.client_secret || "",
		amount,
		currency,
		customerEmail,
		status: "PENDING",
		message: "Card payment intent created successfully.",
		metadata: {
			paymentId: payment.id,
			paymentIntentId: paymentIntent.id,
		},
	}
}

export async function verifyCardPayment(
	reference: string,
	tenantId?: string,
): Promise<CardVerifyResult> {
	if (!isStripeConfigured()) {
		return {
			ok: false,
			provider: "stripe",
			reference,
			status: "FAILED",
			paymentIntentId: reference,
			message:
				"Stripe is not configured. Set STRIPE_SECRET_KEY to enable card payments.",
		}
	}

	const stripe = getStripeClient()

	const payment = await prisma.payment.findFirst({
		where: {
			...(tenantId ? { tenantId } : {}),
			OR: [
				{ providerReference: reference },
				{ metadata: { path: ["reference"], equals: reference } },
			],
		},
	})

	const paymentIntentId = payment?.providerReference || reference

	const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

	let status: CardVerifyResult["status"] = "PENDING"
	let ok = false

	switch (paymentIntent.status) {
		case "succeeded":
			status = "COMPLETED"
			ok = true
			break
		case "canceled":
			status = "CANCELLED"
			break
		case "requires_payment_method":
		case "requires_confirmation":
		case "requires_action":
		case "processing":
			status = "PENDING"
			break
		default:
			status = "FAILED"
	}

	if (payment) {
		const effectiveStatus = payment.status === "COMPLETED" && status !== "COMPLETED" ? "COMPLETED" : status
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: effectiveStatus,
				metadata: {
					...(payment.metadata as Record<string, unknown> | undefined),
					stripeStatus: paymentIntent.status,
				},
			},
		})

		if (effectiveStatus === "COMPLETED" && payment.orderId && payment.status !== "COMPLETED") {
			await recordOrderCommission(payment.id)
			const order = await prisma.order.findFirst({ where: { id: payment.orderId, ...(tenantId || payment.tenantId ? { tenantId: tenantId || payment.tenantId! } : {}) }, select: { id: true } })
			if (!order) return { ok: false, provider: "stripe", reference, status: "FAILED", paymentIntentId, message: "Payment order is not available in this store." }
			const updatedOrder = await confirmPendingOrder(payment.orderId, tenantId || payment.tenantId || undefined)
			if (!updatedOrder) return { ok: false, provider: "stripe", reference, status: "FAILED", paymentIntentId, message: "Payment received but the order is no longer pending." }

			// Send order confirmation email (non-blocking)
			try {
				const email = updatedOrder.userId
					? (
							await prisma.user.findUnique({
								where: { id: updatedOrder.userId },
								select: { email: true },
							})
						)?.email
					: shippingAddressEmail(updatedOrder.shippingAddress)

				if (email) {
					await sendOrderConfirmationEmail(email, updatedOrder)
				}
			} catch (emailError) {
				console.error("Failed to send order confirmation email:", emailError)
			}
		}
	}
	const effectiveStatus = payment?.status === "COMPLETED" && status !== "COMPLETED" ? "COMPLETED" : status
	if (effectiveStatus !== "COMPLETED" && payment?.orderId && payment.status !== "COMPLETED") await cancelPendingOrder(payment.orderId, payment.tenantId || undefined)

	return {
		ok: effectiveStatus === "COMPLETED",
		provider: "stripe",
		reference,
		paymentIntentId,
		status: effectiveStatus,
		amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
		currency: paymentIntent.currency?.toUpperCase(),
		customerEmail: paymentIntent.receipt_email || undefined,
		message: ok
			? "Card payment completed successfully."
			: `Card payment status: ${paymentIntent.status}`,
	}
}
