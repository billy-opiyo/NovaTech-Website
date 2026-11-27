import { NextRequest } from "next/server"
import { getOrderById, updateOrderStatus } from "backend/controllers/orderController"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { revalidateTenantInventory } from "@/lib/public-catalog.server"

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return getOrderById(req, { params })
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const response = await updateOrderStatus(req, { params })
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
