import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { createCardPaymentIntent } from "backend/payments/cards"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"
import { apiErrorResponse } from "backend/lib/api-handler"

const cardIntentSchema = z.object({
	amount: z.number().positive(),
	currency: z.string().length(3).optional(),
	customerEmail: z.string().email(),
	reference: z.string().min(3),
	orderId: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
	if (!isShopperCheckoutEnabled()) return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
	const rateLimitResponse = await rateLimiter(req, "card-create-intent")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = cardIntentSchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		if (validated.orderId) {
			const order = await prisma.order.findFirst({ where: { id: validated.orderId, tenantId: context.tenantId }, select: { userId: true, guestEmail: true } })
			const session = await getServerSession()
			if (!order || (order.userId && order.userId !== session?.user?.id) || (!order.userId && order.guestEmail !== validated.customerEmail.trim().toLowerCase())) {
				return NextResponse.json({ message: "You cannot pay for this order" }, { status: 403 })
			}
		}

		const result = await createCardPaymentIntent({
			amount: validated.amount,
			currency: validated.currency,
			customerEmail: validated.customerEmail,
			reference: validated.reference,
			orderId: validated.orderId,
			tenantId: context.tenantId,
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
		return apiErrorResponse(error, "Unable to create card payment")
	}
}
