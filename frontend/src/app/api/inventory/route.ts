import { NextRequest } from "next/server"
import { getInventory, updateStock } from "backend/controllers/inventoryController"
import { withApiError } from "backend/lib/api-handler"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { revalidateTenantInventory } from "@/lib/public-catalog.server"

export async function GET(req: NextRequest) {
	return withApiError(getInventory, req)
}

export async function PATCH(req: NextRequest) {
	const response = await withApiError(updateStock, req)
	if (response.ok) {
		try {
			const context = await resolveTenantFromRequest(req, { allowUnpublished: true })
			revalidateTenantInventory(context)
		} catch (error: unknown) {
			console.error("Inventory cache invalidation failed", error)
		}
	}
	return response
}
