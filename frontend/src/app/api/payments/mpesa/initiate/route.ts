import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { initiateMpesaPayment } from "backend/payments/mpesa"

const mpesaInitiateSchema = z.object({
	amount: z.number().positive(),
	phone: z.string().regex(/^(07\d{8}|2547\d{8})$/),
	reference: z.string().min(3),
	orderId: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
	const rateLimitResponse = rateLimiter(req)
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = mpesaInitiateSchema.parse(body)

		const result = await initiateMpesaPayment({
			amount: validated.amount,
			phone: validated.phone,
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