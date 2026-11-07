import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { verifyCardPayment } from "backend/payments/cards"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"
import { apiErrorResponse } from "backend/lib/api-handler"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { getActivePlatformStorePaymentRoute } from "backend/payments/platform-store"

const cardVerifySchema = z.object({
	reference: z.string().min(3),
	customerEmail: z.string().trim().email().optional(),
})

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "card-verify")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = cardVerifySchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		if (!isShopperCheckoutEnabled() && context.ownerType !== "PLATFORM") return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
		if (context.ownerType === "PLATFORM" && (await getActivePlatformStorePaymentRoute())?.provider !== "STRIPE") return NextResponse.json({ code: "PLATFORM_STORE_PAYMENTS_NOT_CONFIGURED", message: "Platform product-sale card collection is not configured and authorized." }, { status: 409 })
		const payment = await prisma.payment.findFirst({ where: { tenantId: context.tenantId, storeId: context.storeId, provider: "stripe", purpose: "PRODUCT_SALE", orderId: { not: null }, OR: [{ providerReference: validated.reference }, { metadata: { path: ["reference"], equals: validated.reference } }] }, select: { orderId: true, customerEmail: true, order: { select: { userId: true, guestEmail: true } } } })
		const session = await getServerSession()
		if (!payment?.orderId || !payment.order || (payment.order.userId ? payment.order.userId !== session?.user?.id : (validated.customerEmail || "").toLowerCase() !== (payment.order.guestEmail || payment.customerEmail || "").toLowerCase())) {
			return NextResponse.json({ message: "Card payment request not found for this shopper in this store." }, { status: 404 })
		}
		const result = await verifyCardPayment(validated.reference, context.tenantId, context.storeId)

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
