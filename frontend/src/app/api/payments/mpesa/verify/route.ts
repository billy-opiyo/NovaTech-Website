import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { verifyMpesaPayment } from "backend/payments/mpesa"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { getMerchantMpesaConfig } from "backend/payments/merchant-mpesa"
import prisma from "backend/lib/db"
import { markBillingPaymentFromMpesa, recordOrderCommission } from "backend/billing/service"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"
import { apiErrorResponse } from "backend/lib/api-handler"

const mpesaVerifySchema = z.object({
	reference: z.string().min(3),
})

export async function POST(req: NextRequest) {
	if (!isShopperCheckoutEnabled()) return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
	const rateLimitResponse = await rateLimiter(req, "mpesa-verify")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = mpesaVerifySchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		const payment = await prisma.payment.findFirst({ where: { tenantId: context.tenantId, OR: [{ providerReference: validated.reference }, { metadata: { path: ["reference"], equals: validated.reference } }] } })
		if (!payment || payment.kind !== "ORDER" || !payment.orderId) return NextResponse.json({ message: "Shopper payment request not found in this store." }, { status: 404 })
		const merchantConfig = await getMerchantMpesaConfig(context.tenantId)
		if (!merchantConfig) return NextResponse.json({ code: "MERCHANT_MPESA_NOT_READY", message: "This store has not completed its verified M-Pesa shopper payment setup." }, { status: 409 })
		const result = await verifyMpesaPayment(validated.reference, context.tenantId, merchantConfig)
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
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return apiErrorResponse(error, "Unable to verify M-Pesa payment")
	}
}
