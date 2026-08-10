import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "backend/lib/db"
import { z } from "zod"

const orderSchema = z.object({
	items: z.array(
		z.object({
			productId: z.string(),
			quantity: z.number().int().positive(),
			variant: z.string().optional(),
		}),
	),
	shippingAddress: z.object({
		fullName: z.string(),
		phone: z.string(),
		email: z.string().email(),
		county: z.string(),
		town: z.string(),
		address: z.string(),
		landmark: z.string().optional(),
	}),
	deliveryMethod: z.string(),
	paymentMethod: z.string(),
	subtotal: z.number().positive(),
	shippingCost: z.number().min(0),
	total: z.number().positive(),
	couponCode: z.string().optional(),
	notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const orders = await prisma.order.findMany({
			where: { userId: session.user.id },
			include: {
				items: {
					include: {
						product: {
							select: {
								name: true,
								slug: true,
								images: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: "desc" },
		})

		return NextResponse.json(orders)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions)
		const body = await req.json()
		const validated = orderSchema.parse(body)

		for (const item of validated.items) {
			const product = await prisma.product.findUnique({
				where: { id: item.productId },
				select: { stock: true, price: true, discountedPrice: true, name: true },
			})

			if (!product) {
				return NextResponse.json(
					{ message: `Product not found: ${item.productId}` },
					{ status: 400 },
				)
			}

			if (product.stock < item.quantity) {
				return NextResponse.json(
					{
						message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
					},
					{ status: 400 },
				)
			}
		}

		const order = await prisma.$transaction(async (tx) => {
			const newOrder = await tx.order.create({
				data: {
					userId: session?.user?.id,
					guestEmail: !session?.user
						? validated.shippingAddress.email
						: undefined,
					status: "PENDING",
					subtotal: validated.subtotal,
					shippingCost: validated.shippingCost,
					total: validated.total,
					paymentMethod: validated.paymentMethod,
					shippingAddress: validated.shippingAddress,
					notes: validated.notes,
					items: {
						create: await Promise.all(
							validated.items.map(async (item) => {
								const product = await tx.product.findUnique({
									where: { id: item.productId },
									select: { price: true, discountedPrice: true },
								})
								return {
									productId: item.productId,
									quantity: item.quantity,
									price: product?.discountedPrice || product?.price || 0,
									variant: item.variant,
								}
							}),
						),
					},
				},
			})

			for (const item of validated.items) {
				await tx.product.update({
					where: { id: item.productId },
					data: {
						stock: { decrement: item.quantity },
					},
				})
			}

			if (session?.user) {
				await tx.notification.create({
					data: {
						userId: session.user.id,
						type: "ORDER_STATUS",
						message: `Order #${newOrder.id.slice(-8).toUpperCase()} has been placed successfully.`,
					},
				})
			}

			return newOrder
		})

		return NextResponse.json(order, { status: 201 })
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
