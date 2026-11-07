import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"

const schema = z.object({ orderId: z.string().min(1), paymentId: z.string().min(1).optional(), amount: z.number().finite().positive(), currency: z.string().trim().length(3).default("KES"), reason: z.string().trim().min(3).max(1000), idempotencyKey: z.string().trim().min(8).max(120) }).strict()

export async function POST(request: Request) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	if (!isPlatformAdmin(session)) return NextResponse.json({ message: "Platform administrator access required" }, { status: 403 })
	const store = await getPlatformStore()
	if (!isPlatformOwnedStore(store) || store?.tenant.kind !== "PLATFORM") return NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 })
	const parsed = schema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid refund record", issues: parsed.error.flatten() }, { status: 400 })
	const data = parsed.data
	const order = await prisma.order.findFirst({ where: { id: data.orderId, tenantId: store.tenantId, storeId: store.id }, include: { payments: { where: { purpose: "PRODUCT_SALE", status: "COMPLETED" }, select: { id: true, amount: true, currency: true } } } })
	if (!order) return NextResponse.json({ message: "Platform store order not found" }, { status: 404 })
	const payment = data.paymentId ? order.payments.find((entry) => entry.id === data.paymentId) : order.payments[0]
	if (data.paymentId && !payment) return NextResponse.json({ message: "Select a completed product-sale payment for this order." }, { status: 400 })
	if (!payment) return NextResponse.json({ message: "Only an order with a completed product-sale payment can have a refund request." }, { status: 409 })
	if (payment && (data.amount > payment.amount || data.currency !== payment.currency)) return NextResponse.json({ message: "Refund amount or currency does not match the selected payment." }, { status: 400 })
	const refund = await prisma.refund.upsert({ where: { idempotencyKey: data.idempotencyKey }, update: {}, create: { tenantId: store.tenantId, storeId: store.id, orderId: order.id, paymentId: payment?.id || null, amount: data.amount, currency: data.currency, reason: data.reason, idempotencyKey: data.idempotencyKey } })
	return NextResponse.json({ refund, message: "Refund record saved. Process the refund through the authorized provider account, then record the provider reference and outcome." }, { status: 201 })
}
