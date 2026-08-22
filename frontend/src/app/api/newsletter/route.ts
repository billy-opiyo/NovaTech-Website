import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { z } from "zod"

const newsletterSchema = z.object({
	email: z.string().email(),
	consent: z.literal(true),
})

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "newsletter")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = newsletterSchema.parse(await req.json())
		const context = await resolveTenantFromRequest(req)
		await prisma.newsletterSubscription.upsert({ where: { tenantId_email: { tenantId: context.tenantId, email: body.email.trim().toLowerCase() } }, update: { consentedAt: new Date(), unsubscribedAt: null, source: "storefront-newsletter" }, create: { tenantId: context.tenantId, email: body.email.trim().toLowerCase(), consentedAt: new Date(), source: "storefront-newsletter" } })
		return NextResponse.json(
			{ message: "You are subscribed. You can unsubscribe at any time." },
			{ status: 201 },
		)
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Invalid email", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
