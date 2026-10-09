import prisma from "../../lib/db"
import { sendOrderConfirmationEmail, shippingAddressEmail } from "../../lib/email"
import { getStripeClient, isStripeConfigured } from "../../lib/stripeClient"
import type { CardIntentResult, CardVerifyResult } from "../../types/payments"
import { cancelPendingOrder, finalizePendingOrderPayment } from "../../services/order.service"
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

export function shouldCancelOrderAfterCardVerification(status: string) {
	return status === "FAILED" || status === "CANCELLED"
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
		if (!tenantId) throw new Error("A store context is required for card checkout")
		const order = await prisma.order.findFirst({ where: { id: orderId, tenantId }, select: { total: true, status: true, paymentMethod: true } })
		if (!order) throw new Error("Order not found")
		if (order.status !== "PENDING") throw new Error("Order is no longer payable")
		if (order.paymentMethod !== "CARD") throw new Error("This order was not created for card payment")
		if (Math.abs(order.total - amount) > 0.01) throw new Error("Payment amount does not match the order")
		const store = await prisma.store.findFirst({ where: { tenantId }, select: { currency: true } })
		const orderCurrency = store?.currency.toUpperCase()
		if (!orderCurrency || orderCurrency !== "KES") throw new Error("Card checkout currently supports KES orders only")
		if (currency.toUpperCase() !== orderCurrency) throw new Error("Payment currency does not match the store currency")
		amount = order.total
		currency = orderCurrency
	}

	const existing = await prisma.payment.findFirst({
		where: { provider: "stripe", ...(tenantId ? { tenantId } : {}), metadata: { path: ["reference"], equals: reference } },
	})
	if (existing) {
		if (!orderId || existing.orderId !== orderId || Math.abs(existing.amount - amount) > 0.01 || existing.currency.toUpperCase() !== currency.toUpperCase()) {
			throw new Error("This card payment reference is already associated with a different order or amount")
		}
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
			provider: "stripe",
			...(tenantId ? { tenantId } : {}),
			OR: [
				{ providerReference: reference },
				{ metadata: { path: ["reference"], equals: reference } },
			],
		},
	})
	if (!payment?.providerReference) {
		return { ok: false, provider: "stripe", reference, status: "FAILED", paymentIntentId: reference, message: "Card payment request was not found in this store." }
	}

	const paymentIntentId = payment.providerReference

	const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
	const expectedMinorAmount = Math.round(payment.amount * 100)
	if (paymentIntent.id !== payment.providerReference || paymentIntent.amount !== expectedMinorAmount || paymentIntent.currency.toUpperCase() !== payment.currency.toUpperCase()) {
		return { ok: false, provider: "stripe", reference, status: "FAILED", paymentIntentId, message: "Card payment details do not match the stored payment request." }
	}

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

	const effectiveStatus = payment?.status === "COMPLETED" && status !== "COMPLETED" ? "COMPLETED" : status
	let confirmedOrder = null
	if (payment && effectiveStatus === "COMPLETED" && payment.orderId && payment.tenantId) {
		const settlement = await finalizePendingOrderPayment({ paymentId: payment.id, orderId: payment.orderId, tenantId: payment.tenantId, metadata: { stripeStatus: paymentIntent.status } })
		if (settlement.refundRequired || settlement.reviewRequired) {
			return { ok: false, provider: "stripe", reference, status: "FAILED", paymentIntentId, message: settlement.refundRequired ? "Payment was received after the order was cancelled. The store must review a refund." : "Payment was received but the order requires store review." }
		}
		confirmedOrder = settlement.order
		await recordOrderCommission(payment.id)
	} else if (payment) {
		await prisma.payment.update({ where: { id: payment.id }, data: { status: effectiveStatus, metadata: { ...(payment.metadata as Record<string, unknown> | undefined), stripeStatus: paymentIntent.status } } })
		if (shouldCancelOrderAfterCardVerification(effectiveStatus) && payment.orderId && payment.status !== "COMPLETED") await cancelPendingOrder(payment.orderId, payment.tenantId || undefined)
	}
	if (confirmedOrder) {
		try {
			const email = confirmedOrder.userId ? (await prisma.user.findUnique({ where: { id: confirmedOrder.userId }, select: { email: true } }))?.email : shippingAddressEmail(confirmedOrder.shippingAddress)
			if (email) await sendOrderConfirmationEmail(email, confirmedOrder)
		} catch (emailError) { console.error("Failed to send order confirmation email:", emailError) }
	}

	return {
		ok: effectiveStatus === "COMPLETED",
		provider: "stripe",
		reference,
		paymentIntentId,
		status: effectiveStatus,
		amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
		currency: paymentIntent.currency?.toUpperCase(),
		message: ok
			? "Card payment completed successfully."
			: `Card payment status: ${paymentIntent.status}`,
	}
}
