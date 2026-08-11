import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { createCardPaymentIntent } from "backend/payments/cards"

const cardIntentSchema = z.object({
	amount: z.number().positive(),
	currency: z.string().length(3).optional(),
	customerEmail: z.string().email(),
	reference: z.string().min(3),
	orderId: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
	const rateLimitResponse = rateLimiter(req)
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = cardIntentSchema.parse(body)

		const result = await createCardPaymentIntent({
			amount: validated.amount,
			currency: validated.currency,
			customerEmail: validated.customerEmail,
			reference: validated.reference,
			orderId: validated.orderId,
			metadata: validated.metadata,
		})

		if (!result.ok) {
			return NextResponse.json(result, { status: 400 })
		}

		return NextResponse.json(result, { status: 201 })
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}