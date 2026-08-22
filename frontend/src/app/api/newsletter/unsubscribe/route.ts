import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { z } from "zod"

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "newsletter-unsubscribe")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const { email } = schema.parse(await req.json())
		const context = await resolveTenantFromRequest(req)
		await prisma.newsletterSubscription.updateMany({ where: { tenantId: context.tenantId, email: email.trim().toLowerCase() }, data: { unsubscribedAt: new Date() } })
		return NextResponse.json({ message: "If that address was subscribed, it has been unsubscribed." })
	} catch (error: any) {
		if (error instanceof z.ZodError) return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 })
		return NextResponse.json({ message: error.message || "Unable to update your subscription." }, { status: error?.status || 500 })
	}
}
