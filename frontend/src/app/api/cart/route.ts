import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as cartService from "backend/services/cart.service"

async function getUserId() {
	const session = await getServerSession()
	return session?.user?.id
}

export async function GET() {
	const userId = await getUserId()
	if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
	return NextResponse.json(await cartService.getCart(userId))
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
		return NextResponse.json(await cartService.addCartItem(userId, body.productId, quantity, body.variant), { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Unable to update cart" }, { status: 400 })
	}
}

export async function DELETE() {
	const userId = await getUserId()
	if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
	return NextResponse.json(await cartService.clearCart(userId))
}
