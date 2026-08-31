import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as cartService from "backend/services/cart.service"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { apiErrorResponse } from "backend/lib/api-handler"

async function authorizedUser() {
	const session = await getServerSession()
	return session?.user?.id
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const userId = await authorizedUser()
		if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		const quantity = Number((await req.json()).quantity)
		if (!Number.isInteger(quantity)) return NextResponse.json({ message: "Quantity must be an integer" }, { status: 400 })
		const context = await resolveTenantFromRequest(req)
		return NextResponse.json(await cartService.updateCartItem(userId, (await params).id, quantity, context.tenantId))
	} catch (error: any) {
		return apiErrorResponse(error, "Unable to update cart")
	}
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const userId = await authorizedUser()
	if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
	const context = await resolveTenantFromRequest(req)
	return NextResponse.json(await cartService.removeCartItem(userId, (await params).id, context.tenantId))
}
