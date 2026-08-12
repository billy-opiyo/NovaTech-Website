import { NextRequest } from "next/server"
import { getInventory, updateStock } from "backend/controllers/inventoryController"

export async function GET(req: NextRequest) {
	return getInventory(req)
}

export async function PATCH(req: NextRequest) {
	return updateStock(req)
}
