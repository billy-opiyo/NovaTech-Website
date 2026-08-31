import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { initiateMpesaPayment } from "backend/payments/mpesa"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"
import { apiErrorResponse } from "backend/lib/api-handler"

const mpesaInitiateSchema = z.object({
	amount: z.number().positive(),
	phone: z.string().regex(/^(07\d{8}|2547\d{8})$/),
	reference: z.string().min(3),
	orderId: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
	if (!isShopperCheckoutEnabled()) return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
	const rateLimitResponse = await rateLimiter(req, "mpesa-initiate")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = mpesaInitiateSchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		if (validated.orderId) {
			const order = await prisma.order.findFirst({ where: { id: validated.orderId, tenantId: context.tenantId }, select: { userId: true, shippingAddress: true } })
			const session = await getServerSession()
			const shippingPhone = (order?.shippingAddress as { phone?: string } | null)?.phone
			const normalized = validated.phone.replace(/^254/, "0")
			if (!order || (order.userId && order.userId !== session?.user?.id) || (!order.userId && shippingPhone !== normalized)) {
				return NextResponse.json({ message: "You cannot pay for this order" }, { status: 403 })
			}
		}

		const result = await initiateMpesaPayment({
			amount: validated.amount,
			phone: validated.phone,
			reference: validated.reference,
			orderId: validated.orderId,
			tenantId: context.tenantId,
			metadata: validated.metadata,
		})

		if (!result.ok) {
			return NextResponse.json(result, { status: 400 })
		}

		return NextResponse.json(result, { status: 201 })
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return apiErrorResponse(error, "Unable to initiate M-Pesa payment")
	}
}
