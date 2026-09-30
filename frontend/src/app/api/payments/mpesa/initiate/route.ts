import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { initiateMpesaPayment } from "backend/payments/mpesa"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { getMerchantMpesaConfig } from "backend/payments/merchant-mpesa"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"
import { apiErrorResponse } from "backend/lib/api-handler"
import { normalizePhone } from "backend/lib/daraja"

const shopperPhoneSchema = z.string().trim().refine((value) => {
	try {
		normalizePhone(value)
		return true
	} catch {
		return false
	}
}, "Enter a valid Kenyan phone number, for example 0712345678 or +254712345678")
const mpesaInitiateSchema = z.object({
	phone: shopperPhoneSchema,
	reference: z.string().min(3),
	orderId: z.string().min(1),
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
		const order = await prisma.order.findFirst({
			where: { id: validated.orderId, tenantId: context.tenantId },
			select: { userId: true, shippingAddress: true, total: true, status: true, paymentMethod: true },
		})
		const session = await getServerSession()
		const shippingPhone = (order?.shippingAddress as { phone?: string } | null)?.phone
		const normalizedPhone = normalizePhone(validated.phone)
		let storedPhone = ""
		try { if (shippingPhone) storedPhone = normalizePhone(shippingPhone) } catch { storedPhone = "" }
		if (!order || (order.userId && order.userId !== session?.user?.id) || (!order.userId && storedPhone !== normalizedPhone)) {
			return NextResponse.json({ message: "You cannot pay for this order" }, { status: 403 })
		}
		if (order.paymentMethod !== "MPESA" || order.status !== "PENDING") {
			return NextResponse.json({ message: "This order is not awaiting M-Pesa payment." }, { status: 409 })
		}
		const amount = order.total
		if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ message: "The order has an invalid payable total." }, { status: 409 })
		const merchantConfig = await getMerchantMpesaConfig(context.tenantId)
		if (!merchantConfig) return NextResponse.json({ code: "MERCHANT_MPESA_NOT_READY", message: "This store has not completed its verified M-Pesa shopper payment setup." }, { status: 409 })

		const result = await initiateMpesaPayment({
			amount,
			phone: validated.phone,
			reference: validated.reference,
			orderId: validated.orderId,
			tenantId: context.tenantId,
			kind: "ORDER",
			callbackUrl: new URL("/api/payments/webhooks/mpesa/stk-callback", req.nextUrl.origin).toString(),
			merchantConfig,
			metadata: validated.metadata,
		})

		if (!result.ok) {
			return NextResponse.json(result, { status: 400 })
		}

		return NextResponse.json(result, { status: 201 })
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ code: "MPESA_VALIDATION_ERROR", message: `Payment details need correction: ${error.errors.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ")}`, errors: error.errors },
				{ status: 400 },
			)
		}
		return apiErrorResponse(error, "Unable to initiate M-Pesa payment")
	}
}
