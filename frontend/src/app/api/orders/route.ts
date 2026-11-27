import { NextRequest, NextResponse } from "next/server"
import { getOrders, createOrder } from "backend/controllers/orderController"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { revalidateTenantInventory } from "@/lib/public-catalog.server"

export async function GET(req: NextRequest) {
	return getOrders(req)
}

export async function POST(req: NextRequest) {
	const response = await createOrder(req)
	if (response.ok) {
		try {
			const context = await resolveTenantFromRequest(req, { allowUnpublished: true })
			revalidateTenantInventory(context)
		} catch (error: unknown) {
			console.error("Order cache invalidation failed", error)
		}
	}
	return response
}
