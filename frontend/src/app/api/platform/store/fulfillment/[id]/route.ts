import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"

const schema = z.object({ status: z.enum(["READY_TO_FORWARD", "FORWARDED", "ACCEPTED", "REJECTED", "DISPATCHED", "DELIVERED", "RETURN_REQUESTED", "REFUND_REVIEW", "CLOSED"]), supplierOrderReference: z.string().trim().max(120).optional(), deliveryCost: z.number().finite().min(0).optional(), notes: z.string().trim().max(2000).optional() }).strict()
const fulfillmentTransitions: Record<string, string[]> = {
	PENDING: ["READY_TO_FORWARD", "REJECTED"], READY_TO_FORWARD: ["FORWARDED", "REJECTED"], FORWARDED: ["ACCEPTED", "REJECTED"], ACCEPTED: ["DISPATCHED", "REJECTED"], DISPATCHED: ["DELIVERED", "RETURN_REQUESTED"], DELIVERED: ["RETURN_REQUESTED", "CLOSED"], RETURN_REQUESTED: ["REFUND_REVIEW", "CLOSED"], REFUND_REVIEW: ["CLOSED"],
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	if (!isPlatformAdmin(session)) return NextResponse.json({ message: "Platform administrator access required" }, { status: 403 })
	const store = await getPlatformStore()
	if (!isPlatformOwnedStore(store) || store?.tenant.kind !== "PLATFORM") return NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 })
	const parsed = schema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid fulfillment update", issues: parsed.error.flatten() }, { status: 400 })
	const { id } = await params
	const fulfillment = await prisma.supplierFulfillment.findFirst({
		where: { id, orderItem: { order: { storeId: store.id, tenantId: store.tenantId } } },
		select: {
			id: true,
			status: true,
			orderItem: { select: { order: { select: {
				status: true,
				payments: { where: { purpose: "PRODUCT_SALE", status: "COMPLETED" }, select: { id: true }, take: 1 },
			} } } },
		},
	})
	if (!fulfillment) return NextResponse.json({ message: "Supplier fulfillment not found" }, { status: 404 })
	if (!fulfillmentTransitions[fulfillment.status]?.includes(parsed.data.status)) return NextResponse.json({ message: `Cannot move fulfillment from ${fulfillment.status} to ${parsed.data.status}.` }, { status: 409 })
	if (parsed.data.status === "FORWARDED" && (!(["CONFIRMED", "PROCESSING"].includes(fulfillment.orderItem.order.status)) || !fulfillment.orderItem.order.payments.length)) return NextResponse.json({ message: "Only confirmed, active orders with a completed product-sale payment can be forwarded to a supplier." }, { status: 409 })
	const updated = await prisma.supplierFulfillment.update({ where: { id }, data: { status: parsed.data.status, ...(parsed.data.supplierOrderReference !== undefined ? { supplierOrderReference: parsed.data.supplierOrderReference || null } : {}), ...(parsed.data.deliveryCost !== undefined ? { deliveryCost: parsed.data.deliveryCost } : {}), ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}), ...(parsed.data.status === "FORWARDED" ? { forwardedAt: new Date() } : {}), updatedById: session.user.id } })
	return NextResponse.json({ fulfillment: updated })
}
