import { NextRequest, NextResponse } from "next/server"
import { getOrders, createOrder } from "backend/controllers/orderController"

export async function GET(req: NextRequest) {
	return getOrders(req)
}

export async function POST(req: NextRequest) {
	return createOrder(req)
}