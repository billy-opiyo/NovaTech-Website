import { NextRequest } from "next/server"
import { getInventory, updateStock } from "backend/controllers/inventoryController"
import { withApiError } from "backend/lib/api-handler"

export async function GET(req: NextRequest) {
	return withApiError(getInventory, req)
}

export async function PATCH(req: NextRequest) {
	return withApiError(updateStock, req)
}
