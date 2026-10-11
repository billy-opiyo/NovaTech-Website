import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { verifyMpesaPayment } from "backend/payments/mpesa"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { getMerchantMpesaConfig } from "backend/payments/merchant-mpesa"
import prisma from "backend/lib/db"
import { getServerSession } from "@/lib/auth"
import { normalizePhone } from "backend/lib/daraja"
import { canAccessShopperOrder } from "backend/payments/shopper-order-access"
import { markBillingPaymentFromMpesa, recordOrderCommission } from "backend/billing/service"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"
import { apiErrorResponse } from "backend/lib/api-handler"

const mpesaVerifySchema = z.object({
	orderId: z.string().min(1),
	phone: z.string().trim().refine((value) => {
		try {
			normalizePhone(value)
			return true
		} catch {
			return false
		}
	}, "Enter a valid Kenyan phone number"),
})

export async function POST(req: NextRequest) {
	if (!isShopperCheckoutEnabled()) return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
	const rateLimitResponse = await rateLimiter(req, "mpesa-verify")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = mpesaVerifySchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		const order = await prisma.order.findFirst({
			where: { id: validated.orderId, tenantId: context.tenantId },
			select: { id: true, userId: true, shippingAddress: true },
		})
		const session = await getServerSession()
		if (!order || !canAccessShopperOrder(order, session?.user?.id, validated.phone)) {
			return NextResponse.json({ message: "You cannot verify payment for this order." }, { status: 403 })
		}
		const payment = await prisma.payment.findFirst({
			where: { tenantId: context.tenantId, orderId: order.id, provider: "mpesa", kind: "ORDER" },
			orderBy: { createdAt: "desc" },
		})
		if (!payment) return NextResponse.json({ message: "Shopper payment request not found for this order." }, { status: 404 })
		const referenceValue = (payment.metadata as { reference?: unknown } | null)?.reference
		if (typeof referenceValue !== "string" || referenceValue.length < 3) return NextResponse.json({ message: "This order's payment request cannot be verified. Contact the store." }, { status: 409 })
		const merchantConfig = await getMerchantMpesaConfig(context.tenantId)
		if (!merchantConfig) return NextResponse.json({ code: "MERCHANT_MPESA_NOT_READY", message: "This store has not completed its configured M-Pesa shopper payment setup, or Daraja credentials are unavailable." }, { status: 409 })
		const result = await verifyMpesaPayment(referenceValue, context.tenantId, merchantConfig, payment.id)
		if (payment && result.status !== "PENDING") {
			// Order payment state is reconciled by verifyMpesaPayment. SaaS billing
			// reconciliation is intentionally not used for shopper payments.
			if (payment.kind !== "ORDER") await markBillingPaymentFromMpesa({ id: payment.id, status: result.status, invoiceId: payment.invoiceId, subscriptionId: payment.subscriptionId, billingRecordId: payment.billingRecordId, failureReason: result.message })
			if (payment.kind === "ORDER" && result.status === "COMPLETED") await recordOrderCommission(payment.id)
		}

		return NextResponse.json(result)
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ code: "MPESA_VERIFY_VALIDATION_ERROR", message: `Payment verification details need correction: ${error.errors.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ")}`, errors: error.errors },
				{ status: 400 },
			)
		}
		return apiErrorResponse(error, "Unable to verify M-Pesa payment")
	}
}
