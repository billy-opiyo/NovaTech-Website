import { NextRequest } from "next/server"
import { getAllOrders, getOrderStats } from "backend/controllers/orderController"

export async function GET(req: NextRequest) {
	if (req.nextUrl.searchParams.get("stats") === "true") return getOrderStats()
	return getAllOrders(req)
}
