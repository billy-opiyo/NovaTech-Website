import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { getShopperOrderPaymentReference, initiateMpesaPayment } from "backend/payments/mpesa"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { getMerchantMpesaConfig } from "backend/payments/merchant-mpesa"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"
import { apiErrorResponse } from "backend/lib/api-handler"
import { normalizePhone } from "backend/lib/daraja"
import { canAccessShopperOrder } from "backend/payments/shopper-order-access"

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
	orderId: z.string().min(1),
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
			select: { id: true, userId: true, shippingAddress: true, total: true, status: true, paymentMethod: true },
		})
		const session = await getServerSession()
		if (!order || !canAccessShopperOrder(order, session?.user?.id, validated.phone)) {
			return NextResponse.json({ message: "You cannot pay for this order" }, { status: 403 })
		}
		if (order.paymentMethod !== "MPESA" || order.status !== "PENDING") {
			return NextResponse.json({ message: "This order is not awaiting M-Pesa payment." }, { status: 409 })
		}
		const amount = order.total
		if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ message: "The order has an invalid payable total." }, { status: 409 })
		const existingPayment = await prisma.payment.findFirst({
			where: { tenantId: context.tenantId, orderId: order.id, provider: "mpesa", kind: "ORDER", status: { in: ["PENDING", "PROCESSING"] } },
			orderBy: { createdAt: "desc" },
		})
		const existingReference = (existingPayment?.metadata as { reference?: unknown } | null)?.reference
		if (existingPayment && Math.abs(existingPayment.amount - amount) > 0.01) {
			return NextResponse.json({ message: "The pending M-Pesa request does not match this order total. Contact the store before retrying." }, { status: 409 })
		}
		if (existingPayment && typeof existingReference === "string" && existingReference.length >= 3) {
			return NextResponse.json({
				ok: true,
				provider: "mpesa",
				reference: existingReference,
				checkoutRequestId: existingPayment.providerReference || "",
				phone: existingPayment.phoneNumber || validated.phone,
				amount: existingPayment.amount,
				currency: existingPayment.currency,
				status: "PENDING",
				message: "An M-Pesa request is already pending for this order.",
			}, { status: 200 })
		}
		const merchantConfig = await getMerchantMpesaConfig(context.tenantId)
		if (!merchantConfig) return NextResponse.json({ code: "MERCHANT_MPESA_NOT_READY", message: "This store has not completed its configured M-Pesa shopper payment setup, or Daraja credentials are unavailable." }, { status: 409 })

		const result = await initiateMpesaPayment({
			amount,
			phone: validated.phone,
			reference: getShopperOrderPaymentReference(validated.orderId),
			orderId: validated.orderId,
			tenantId: context.tenantId,
			kind: "ORDER",
			callbackUrl: new URL("/api/payments/webhooks/mpesa/stk-callback", req.nextUrl.origin).toString(),
			merchantConfig,
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
