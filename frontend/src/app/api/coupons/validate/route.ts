import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "coupon-validate")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const context = await resolveTenantFromRequest(req)
		const { code, subtotal } = await req.json()

		if (!code) {
			return NextResponse.json(
				{ message: "Coupon code is required" },
				{ status: 400 },
			)
		}

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
		if (coupon.discountPercent) {
			discount = subtotal * (coupon.discountPercent / 100)
		} else if (coupon.discountAmount) {
			discount = coupon.discountAmount
		}

		return NextResponse.json({
			valid: true,
			discount,
			code: coupon.code,
			message: `Coupon applied! You save KES ${discount.toLocaleString()}`,
		})
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
