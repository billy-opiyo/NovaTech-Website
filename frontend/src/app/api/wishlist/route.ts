import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const wishlist = await prisma.wishlistItem.findMany({
			where: { userId: session.user.id },
			include: {
				product: {
					select: {
						id: true,
						name: true,
						slug: true,
						price: true,
						discountedPrice: true,
						images: true,
						brand: true,
						stock: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		})

		return NextResponse.json(wishlist)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const userId = session.user.id
		if (!userId) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const { productId } = await req.json()

		const existing = await prisma.wishlistItem.findFirst({
			where: {
				userId,
				productId,
			},
		})

		if (existing) {
			return NextResponse.json(
				{ message: "Already in wishlist" },
				{ status: 400 },
			)
		}

		const wishlistItem = await prisma.wishlistItem.create({
			data: {
				userId,
				productId,
			},
			include: {
				product: true,
			},
		})

		return NextResponse.json(wishlistItem, { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const { productId } = await req.json()

		await prisma.wishlistItem.deleteMany({
			where: {
				userId: session.user.id,
				productId,
			},
		})

		return NextResponse.json({ message: "Removed from wishlist" })
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
