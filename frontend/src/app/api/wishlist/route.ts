import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}
		const context = await resolveTenantFromRequest(req)

		const wishlist = await prisma.wishlistItem.findMany({
			where: { userId: session.user.id, tenantId: context.tenantId },
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
						variants: { select: { stock: true }, where: { tenantId: context.tenantId } },
					},
				},
			},
			orderBy: { createdAt: "desc" },
		})

		return NextResponse.json(wishlist)
	} catch (error: unknown) {
		return apiErrorResponse(error, "Wishlist unavailable")
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const userId = session.user.id
		const context = await resolveTenantFromRequest(req)
		if (!userId) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const body = await req.json().catch(() => ({}))
		const productId = body.productId

		const existing = await prisma.wishlistItem.findFirst({
			where: {
				userId,
				tenantId: context.tenantId,
				productId,
			},
		})

		if (existing) {
			return NextResponse.json(
				{ message: "Already in wishlist" },
				{ status: 400 },
			)
		}

		const product = await prisma.product.findFirst({ where: { id: productId, tenantId: context.tenantId }, select: { id: true } })
		if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 })
		const wishlistItem = await prisma.wishlistItem.create({
			data: {
				userId,
				tenantId: context.tenantId,
				productId,
			},
			include: {
				product: true,
			},
		})

		return NextResponse.json(wishlistItem, { status: 201 })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to update wishlist")
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const body = await req.json().catch(() => ({})) as { productId?: string }
		const { productId } = body
		const context = await resolveTenantFromRequest(req)

		await prisma.wishlistItem.deleteMany({ where: { userId: session.user.id, tenantId: context.tenantId, ...(productId ? { productId } : {}) } })

		return NextResponse.json({ message: "Removed from wishlist" })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to update wishlist")
	}
}
