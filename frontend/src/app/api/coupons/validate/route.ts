import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { z } from "zod"
import { apiErrorResponse } from "backend/lib/api-handler"

const couponValidationSchema = z.object({
	code: z.string().trim().min(1).max(32),
	subtotal: z.number().finite().min(0),
})

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "coupon-validate")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const context = await resolveTenantFromRequest(req)
		const parsed = couponValidationSchema.safeParse(await req.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "A valid coupon code and subtotal are required", errors: parsed.error.flatten() }, { status: 400 })
		const { code, subtotal } = parsed.data

		const coupon = await prisma.coupon.findFirst({ where: { code: code.toUpperCase(), tenantId: context.tenantId } })

		if (!coupon) {
			return NextResponse.json(
				{ valid: false, message: "Invalid coupon code" },
				{ status: 404 },
			)
		}

		if (new Date() > coupon.expiresAt) {
			return NextResponse.json(
				{ valid: false, message: "This coupon has expired" },
				{ status: 400 },
			)
		}

		if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
			return NextResponse.json(
				{ valid: false, message: "This coupon has reached its usage limit" },
				{ status: 400 },
			)
		}

		if (!coupon.isActive) {
			return NextResponse.json(
				{ valid: false, message: "This coupon is no longer active" },
				{ status: 400 },
			)
		}

		if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
			return NextResponse.json(
				{
					valid: false,
					message: `Minimum order value of KES ${coupon.minOrderValue.toLocaleString()} required`,
				},
				{ status: 400 },
			)
		}

		let discount = 0
		if (coupon.discountPercent) discount = subtotal * (coupon.discountPercent / 100)
		else if (coupon.discountAmount) discount = coupon.discountAmount
		discount = Math.min(subtotal, Math.max(0, discount))

		return NextResponse.json({
			valid: true,
			discount,
			code: coupon.code,
			message: `Coupon applied! You save KES ${discount.toLocaleString()}`,
		})
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to validate coupon")
	}
}
