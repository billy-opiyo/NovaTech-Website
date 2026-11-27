import { NextRequest, NextResponse } from "next/server"
import { handleStripeEvent, verifyStripeWebhookSignature } from "backend/payments/webhooks"
import { revalidateOrderPaymentCache } from "@/lib/payment-cache-invalidation.server"

export async function POST(req: NextRequest) {
	const rawBody = await req.text()
	const signature = req.headers.get("stripe-signature") || ""

	const verification = verifyStripeWebhookSignature(rawBody, signature)
	if (!verification.ok) {
		return NextResponse.json(
			{ message: verification.error || "Invalid signature" },
			{ status: 400 },
		)
	}

	const event = verification.event
	const result = await handleStripeEvent(event as unknown as Record<string, unknown>)
	const data = event.data as unknown as { object?: Record<string, unknown> } | undefined
	const object = data?.object || {}
	const reference = event.type === "charge.refunded"
		? typeof object.payment_intent === "string" ? object.payment_intent : undefined
		: typeof object.payment_intent === "string" ? object.payment_intent : typeof object.id === "string" ? object.id : undefined
	if (result.ok && (event.type === "payment_intent.succeeded" || event.type === "checkout.session.completed" || event.type === "charge.refunded")) {
		await revalidateOrderPaymentCache("stripe", reference)
	}

	return NextResponse.json(result)
}
