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
import { createManualShopperPayment, getManualShopperPaymentDestination, submitManualShopperReceipt } from "backend/payments/manual-shopper"

const shopperPhoneSchema = z.string().trim().refine((value) => {
	try {
		normalizePhone(value)
		return true
	} catch {
		return false
	}
}, "Enter a valid Kenyan phone number, for example 0712345678 or +254712345678")
const mpesaInitiateSchema = z.object({
	mode: z.literal("STK").optional(),
	phone: shopperPhoneSchema,
	orderId: z.string().min(1),
})
const manualPaymentSchema = z.object({ mode: z.literal("PHONE_TRANSFER"), phone: shopperPhoneSchema, orderId: z.string().min(1) })
const manualReceiptSchema = z.object({ mode: z.literal("SUBMIT_RECEIPT"), phone: shopperPhoneSchema, orderId: z.string().min(1), paymentId: z.string().min(1), receiptCode: z.string().trim().min(8).max(12) })
const manualStatusSchema = z.object({ mode: z.literal("CHECK_STATUS"), phone: shopperPhoneSchema, orderId: z.string().min(1), paymentId: z.string().min(1) })
const requestSchema = z.union([manualReceiptSchema, manualPaymentSchema, manualStatusSchema, mpesaInitiateSchema])

export async function GET(req: NextRequest) {
	if (!isShopperCheckoutEnabled()) return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
	try {
		const context = await resolveTenantFromRequest(req)
		const [stkConfig, manualDestination] = await Promise.all([getMerchantMpesaConfig(context.tenantId), getManualShopperPaymentDestination(context.tenantId)])
		return NextResponse.json({ stkAvailable: Boolean(stkConfig), manualTransfer: manualDestination })
	} catch (error) {
		return apiErrorResponse(error, "Shopper payment options unavailable")
	}
}

export async function POST(req: NextRequest) {
	if (!isShopperCheckoutEnabled()) return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
	const rateLimitResponse = await rateLimiter(req, "mpesa-initiate")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = requestSchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		const order = await prisma.order.findFirst({
			where: { id: validated.orderId, tenantId: context.tenantId },
			select: { id: true, userId: true, shippingAddress: true, total: true, status: true, paymentMethod: true },
		})
		const session = await getServerSession()
		if (!order || !canAccessShopperOrder(order, session?.user?.id, validated.phone)) {
			return NextResponse.json({ message: "You cannot pay for this order" }, { status: 403 })
		}
		if (validated.mode === "CHECK_STATUS") {
			const payment = await prisma.payment.findFirst({ where: { id: validated.paymentId, tenantId: context.tenantId, orderId: order.id, provider: "mpesa-manual", kind: "ORDER" }, select: { status: true, metadata: true } })
			if (!payment || (payment.metadata as { manualMode?: unknown } | null)?.manualMode !== "PHONE_TRANSFER") return NextResponse.json({ message: "Phone-transfer payment not found." }, { status: 404 })
			const paymentMetadata = payment.metadata as { orderSettlement?: unknown } | null
			return NextResponse.json({ status: payment.status, orderStatus: order.status, settlementIssue: paymentMetadata?.orderSettlement === "REFUND_REQUIRED_ORDER_CANCELLED" || paymentMetadata?.orderSettlement === "REVIEW_REQUIRED" })
		}
		if (order.paymentMethod !== "MPESA" || order.status !== "PENDING") {
			return NextResponse.json({ message: "This order is not awaiting M-Pesa payment." }, { status: 409 })
		}
		const amount = order.total
		if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ message: "The order has an invalid payable total." }, { status: 409 })
		if (validated.mode === "PHONE_TRANSFER") {
			const payment = await createManualShopperPayment({ tenantId: context.tenantId, orderId: order.id, phone: validated.phone })
			return NextResponse.json({ ok: true, provider: "mpesa-manual", ...payment, message: "Send the exact order amount to the merchant phone number, then submit the M-Pesa receipt code. The order remains pending until the store verifies it." }, { status: 201 })
		}
		if (validated.mode === "SUBMIT_RECEIPT") {
			const result = await submitManualShopperReceipt({ tenantId: context.tenantId, orderId: order.id, paymentId: validated.paymentId, receiptCode: validated.receiptCode })
			return NextResponse.json(result)
		}
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
