import { NextRequest, NextResponse } from "next/server"
import { handleStripeEvent, verifyStripeWebhookSignature } from "backend/payments/webhooks"

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

	return NextResponse.json(result)
}