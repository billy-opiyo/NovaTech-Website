import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"
import { summarizePlatformStoreFinancials } from "backend/lib/platform-store-report"

async function platformStoreResponse() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	const store = await getPlatformStore()
	if (!isPlatformOwnedStore(store) || store?.tenant.kind !== "PLATFORM") return { response: NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 }) }
	return { store, session }
}

export async function GET() {
	const result = await platformStoreResponse()
	if ("response" in result) return result.response
	const orderWhere = { tenantId: result.store.tenantId, storeId: result.store.id }
	const [orders, orderCount, completedPayments, completedRefunds, fulfilledItems] = await Promise.all([
		prisma.order.findMany({ where: orderWhere, include: { items: { include: { product: { select: { name: true, sku: true } }, supplierFulfillment: { include: { supplier: { select: { name: true } } } } } }, payments: { where: { purpose: "PRODUCT_SALE" }, select: { id: true, provider: true, amount: true, currency: true, status: true, providerReference: true, createdAt: true } }, refunds: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" }, take: 250 }),
		prisma.order.count({ where: orderWhere }),
		prisma.payment.aggregate({ where: { storeId: result.store.id, tenantId: result.store.tenantId, purpose: "PRODUCT_SALE", status: "COMPLETED" }, _sum: { amount: true } }),
		prisma.refund.aggregate({ where: { storeId: result.store.id, tenantId: result.store.tenantId, status: "COMPLETED" }, _sum: { amount: true } }),
		prisma.orderItem.findMany({ where: { order: { ...orderWhere, payments: { some: { purpose: "PRODUCT_SALE", status: "COMPLETED" } } }, supplierFulfillment: { isNot: null } }, select: { quantity: true, supplierFulfillment: { select: { supplierCost: true, deliveryCost: true } } } }),
	])
	const financials = summarizePlatformStoreFinancials({
		completedPaymentAmounts: completedPayments._sum.amount === null ? [] : [completedPayments._sum.amount],
		completedRefundAmounts: completedRefunds._sum.amount === null ? [] : [completedRefunds._sum.amount],
		fulfilledItems: fulfilledItems.flatMap((item) => item.supplierFulfillment ? [{ quantity: item.quantity, supplierCost: item.supplierFulfillment.supplierCost, deliveryCost: item.supplierFulfillment.deliveryCost }] : []),
	})
	return NextResponse.json({ orders, summary: { orderCount, ...financials, displayedOrderCount: orders.length } })
}
