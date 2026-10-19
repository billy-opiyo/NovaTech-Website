import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { apiErrorResponse } from "backend/lib/api-handler"
import { listManualShopperReceipts, reviewManualShopperReceipt } from "backend/payments/manual-shopper"

const reviewSchema = z.object({ paymentId: z.string().min(1), approve: z.boolean(), note: z.string().max(500).optional() }).strict()

async function access() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
	await requireStorePermission(session.user.id, context.tenantId, "UPDATE_ORDERS")
	return { context, userId: session.user.id }
}

export async function GET() {
	try {
		const current = await access()
		if ("response" in current) return current.response
		return NextResponse.json({ receipts: await listManualShopperReceipts(current.context.tenantId) })
	} catch (error) {
		return apiErrorResponse(error, "Manual shopper receipts unavailable")
	}
}

export async function POST(request: Request) {
	try {
		const current = await access()
		if ("response" in current) return current.response
		const parsed = reviewSchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Invalid receipt review request", issues: parsed.error.flatten() }, { status: 400 })
		return NextResponse.json(await reviewManualShopperReceipt({ tenantId: current.context.tenantId, reviewerId: current.userId, ...parsed.data }))
	} catch (error) {
		return apiErrorResponse(error, "Unable to review shopper receipt")
	}
}
