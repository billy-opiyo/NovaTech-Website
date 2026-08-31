import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as cartService from "backend/services/cart.service"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { apiErrorResponse } from "backend/lib/api-handler"

async function getUserId() {
	const session = await getServerSession()
	return session?.user?.id
}

export async function GET(req: NextRequest) {
	const userId = await getUserId()
	if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
	const context = await resolveTenantFromRequest(req)
	return NextResponse.json(await cartService.getCart(userId, context.tenantId))
}

export async function POST(req: NextRequest) {
	try {
		const userId = await getUserId()
		if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		const body = await req.json()
		const quantity = Number(body.quantity)
		if (!body.productId || !Number.isInteger(quantity)) {
			return NextResponse.json({ message: "productId and integer quantity are required" }, { status: 400 })
		}
		const context = await resolveTenantFromRequest(req)
		return NextResponse.json(await cartService.addCartItem(userId, body.productId, quantity, context.tenantId, body.variant), { status: 201 })
	} catch (error: any) {
		return apiErrorResponse(error, "Unable to update cart")
	}
}

export async function DELETE(req: NextRequest) {
	const userId = await getUserId()
	if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
	const context = await resolveTenantFromRequest(req)
	return NextResponse.json(await cartService.clearCart(userId, context.tenantId))
}
