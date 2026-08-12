import { NextRequest } from "next/server"
import { getInventory } from "backend/controllers/inventoryController"

export async function GET(req: NextRequest) {
	return getInventory(req)
}