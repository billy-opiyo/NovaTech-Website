import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"
import { listManualShopperReceipts, reviewManualShopperReceipt } from "backend/payments/manual-shopper"
import { apiErrorResponse } from "backend/lib/api-handler"

async function access() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	const store = await getPlatformStore()
	if (!store || !isPlatformOwnedStore(store)) return { response: NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 }) }
	return { session, store }
}

export async function GET() {
	const result = await access()
	if ("response" in result) return result.response
	const receipts = await listManualShopperReceipts(result.store.tenantId)
	const matching = receipts.filter((item) => item.order?.id && item.order.status === "PENDING")
	return NextResponse.json({ receipts: matching })
}

export async function POST(request: Request) {
	const result = await access()
	if ("response" in result) return result.response
	const parsed = z.object({ paymentId: z.string().min(1), approve: z.boolean(), note: z.string().trim().max(500).optional() }).safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid receipt review details." }, { status: 400 })
	try {
		const payment = await prisma.payment.findFirst({ where: { id: parsed.data.paymentId, tenantId: result.store.tenantId, storeId: result.store.id, purpose: "PRODUCT_SALE", provider: "mpesa-manual" }, select: { id: true } })
		if (!payment) return NextResponse.json({ message: "Platform store receipt not found." }, { status: 404 })
		const reviewed = await reviewManualShopperReceipt({ tenantId: result.store.tenantId, paymentId: payment.id, reviewerId: result.session.user.id, approve: parsed.data.approve, note: parsed.data.note })
		return NextResponse.json(reviewed)
	} catch (error) { return apiErrorResponse(error, "Receipt review failed") }
}
