import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { verifyMpesaPayment } from "backend/payments/mpesa"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import prisma from "backend/lib/db"
import { markBillingPaymentFromMpesa, recordOrderCommission } from "backend/billing/service"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "backend/lib/commerce-model"

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
		const result = await verifyMpesaPayment(validated.reference, context.tenantId)
		const payment = await prisma.payment.findFirst({ where: { tenantId: context.tenantId, OR: [{ providerReference: validated.reference }, { metadata: { path: ["reference"], equals: validated.reference } }] } })
		if (payment && result.status !== "PENDING") {
			await markBillingPaymentFromMpesa({ id: payment.id, status: result.status, invoiceId: payment.invoiceId, subscriptionId: payment.subscriptionId, billingRecordId: payment.billingRecordId, failureReason: result.message })
			await recordOrderCommission(payment.id)
		}

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
