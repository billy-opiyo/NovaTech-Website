import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as cartService from "backend/services/cart.service"

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
		return NextResponse.json(await cartService.updateCartItem(userId, (await params).id, quantity))
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Unable to update cart" }, { status: 400 })
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const userId = await authorizedUser()
	if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
	return NextResponse.json(await cartService.removeCartItem(userId, (await params).id))
}
