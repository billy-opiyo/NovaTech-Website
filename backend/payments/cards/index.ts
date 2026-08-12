import prisma from "../../lib/db"
import { sendOrderConfirmationEmail } from "../../lib/email"
import { getStripeClient, isStripeConfigured } from "../../lib/stripeClient"
import type { CardIntentResult, CardVerifyResult } from "../../types/payments"
import { cancelPendingOrder } from "../../services/order.service"

export type CardPaymentPayload = {
	amount: number
	currency?: string
	customerEmail: string
	reference: string
	orderId?: string
	metadata?: Record<string, unknown>
}

export async function createCardPaymentIntent({
	amount,
	currency = "KES",
	customerEmail,
	reference,
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
		const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true, status: true } })
		if (!order) throw new Error("Order not found")
		if (order.status !== "PENDING") throw new Error("Order is no longer payable")
		if (Math.abs(order.total - amount) > 0.01) throw new Error("Payment amount does not match the order")
		amount = order.total
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
			orderId,
			provider: "stripe",
			amount,
			currency,
			status: "PENDING",
			providerReference: paymentIntent.id,
			customerEmail,
			metadata: {
				reference,
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
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status,
				metadata: {
					...(payment.metadata as Record<string, unknown> | undefined),
					stripeStatus: paymentIntent.status,
				},
			},
		})

		if (ok && payment.orderId) {
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
	if (!ok && payment?.orderId) await cancelPendingOrder(payment.orderId)

	return {
		ok,
		provider: "stripe",
		reference,
		paymentIntentId,
		status,
		amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
		currency: paymentIntent.currency?.toUpperCase(),
		customerEmail: paymentIntent.receipt_email || undefined,
		message: ok
			? "Card payment completed successfully."
			: `Card payment status: ${paymentIntent.status}`,
	}
}
