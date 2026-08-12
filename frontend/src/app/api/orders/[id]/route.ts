import { NextRequest } from "next/server"
import { getOrderById, updateOrderStatus } from "backend/controllers/orderController"

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
	return updateOrderStatus(req, { params })
}