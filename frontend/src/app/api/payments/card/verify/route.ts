import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { verifyCardPayment } from "backend/payments/cards"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"
import { apiErrorResponse } from "backend/lib/api-handler"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"

const cardVerifySchema = z.object({
	reference: z.string().min(3),
	customerEmail: z.string().trim().email().optional(),
})

export async function POST(req: NextRequest) {
	if (!isShopperCheckoutEnabled()) return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
	const rateLimitResponse = await rateLimiter(req, "card-verify")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = cardVerifySchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		const payment = await prisma.payment.findFirst({ where: { tenantId: context.tenantId, provider: "stripe", OR: [{ providerReference: validated.reference }, { metadata: { path: ["reference"], equals: validated.reference } }] }, select: { orderId: true, customerEmail: true, order: { select: { userId: true, guestEmail: true } } } })
		const session = await getServerSession()
		if (!payment?.orderId || !payment.order || (payment.order.userId ? payment.order.userId !== session?.user?.id : (validated.customerEmail || "").toLowerCase() !== (payment.order.guestEmail || payment.customerEmail || "").toLowerCase())) {
			return NextResponse.json({ message: "Card payment request not found for this shopper in this store." }, { status: 404 })
		}
		const result = await verifyCardPayment(validated.reference, context.tenantId)

		return NextResponse.json(result)
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return apiErrorResponse(error, "Unable to verify card payment")
	}
}
