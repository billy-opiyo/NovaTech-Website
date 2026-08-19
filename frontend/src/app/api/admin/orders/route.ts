import { NextRequest } from "next/server"
import { getAllOrders, getOrderStats } from "backend/controllers/orderController"
import { withApiError } from "backend/lib/api-handler"

export async function GET(req: NextRequest) {
	if (req.nextUrl.searchParams.get("stats") === "true") return withApiError(getOrderStats, req)
	return withApiError(getAllOrders, req)
}
