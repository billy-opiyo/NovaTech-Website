import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "backend/lib/db"

export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const order = await prisma.order.findUnique({
			where: { id: params.id },
			include: {
				items: {
					include: {
						product: {
							select: {
								name: true,
								slug: true,
								images: true,
								brand: true,
							},
						},
					},
				},
			},
		})

		if (!order) {
			return NextResponse.json({ message: "Order not found" }, { status: 404 })
		}

		if (
			order.userId !== session.user.id &&
			session.user.role !== "ADMIN" &&
			session.user.role !== "SUPERADMIN"
		) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		return NextResponse.json(order)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const session = await getServerSession(authOptions)
		if (
			!session?.user ||
			(session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
		) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const { status, trackingNumber } = await req.json()

		const order = await prisma.order.update({
			where: { id: params.id },
			data: {
				status,
				...(trackingNumber && { trackingNumber }),
			},
		})

		if (order.userId) {
			await prisma.notification.create({
				data: {
					userId: order.userId,
					type: "ORDER_STATUS",
					message: `Your order #${order.id.slice(-8).toUpperCase()} status updated to ${status.replace(/_/g, " ")}.`,
				},
			})
		}

		return NextResponse.json(order)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
