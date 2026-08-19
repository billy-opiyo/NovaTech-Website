import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { verifyMpesaPayment } from "backend/payments/mpesa"
import { resolveTenantFromRequest } from "backend/lib/tenant"

const mpesaVerifySchema = z.object({
	reference: z.string().min(3),
})

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "mpesa-verify")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = mpesaVerifySchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		const result = await verifyMpesaPayment(validated.reference, context.tenantId)

		return NextResponse.json(result)
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
