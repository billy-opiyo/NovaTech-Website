import prisma from "../lib/db"
import { Prisma } from "@prisma/client"
import { sendOrderStatusUpdate } from "../notifications/sms"
import { sendWhatsAppMessage } from "../notifications/whatsapp"

export interface CreateOrderData {
	userId?: string
	guestEmail?: string
	items: {
		productId: string
		quantity: number
		variant?: string
	}[]
	shippingAddress: {
		fullName: string
		phone: string
		email: string
		county: string
		town: string
		address: string
		landmark?: string
	}
	deliveryMethod: string
	paymentMethod: string
	subtotal: number
	shippingCost: number
	total: number
	couponCode?: string
	notes?: string
}

export async function createOrder(data: CreateOrderData) {
	return prisma.$transaction(async (tx) => {
		// Validate stock availability
		for (const item of data.items) {
			const product = await tx.product.findUnique({
				where: { id: item.productId },
				select: { stock: true, name: true },
			})

			if (!product) {
				throw new Error(`Product not found: ${item.productId}`)
			}

			if (product.stock < item.quantity) {
				throw new Error(
					`Insufficient stock for ${product.name}. Available: ${product.stock}`,
				)
			}
		}

		// Get product prices for order items
		const orderItems = await Promise.all(
			data.items.map(async (item) => {
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
		)

		// Create order
		const order = await tx.order.create({
			data: {
				userId: data.userId,
				guestEmail: data.guestEmail,
				status: "PENDING",
				subtotal: data.subtotal,
				shippingCost: data.shippingCost,
				total: data.total,
				paymentMethod: data.paymentMethod,
				shippingAddress: data.shippingAddress,
				notes: data.notes,
				items: {
					create: orderItems,
				},
			},
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
		})

		// Decrement stock
		for (const item of data.items) {
			await tx.product.update({
				where: { id: item.productId },
				data: {
					stock: { decrement: item.quantity },
				},
			})
		}

		// Create notification for user
		if (data.userId) {
			await tx.notification.create({
				data: {
					userId: data.userId,
					type: "ORDER_STATUS",
					message: `Order #${order.id.slice(-8).toUpperCase()} has been placed successfully.`,
				},
			})
		}

		return order
	})
}

export async function getOrdersByUserId(userId: string, page = 1, limit = 20) {
	const skip = (page - 1) * limit

	const [orders, total] = await Promise.all([
		prisma.order.findMany({
			where: { userId },
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
			skip,
			take: limit,
		}),
		prisma.order.count({ where: { userId } }),
	])

	return {
		orders,
		total,
		page,
		totalPages: Math.ceil(total / limit),
	}
}

export async function getOrderById(orderId: string, userId?: string) {
	const order = await prisma.order.findUnique({
		where: { id: orderId },
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
			user: {
				select: {
					name: true,
					email: true,
					phone: true,
				},
			},
		},
	})

	if (!order) {
		throw new Error("Order not found")
	}

	// Check if user has access to this order
	if (userId && order.userId !== userId) {
		throw new Error("Unauthorized")
	}

	return order
}

export async function updateOrderStatus(
	orderId: string,
	status: string,
	trackingNumber?: string,
) {
	const order = await prisma.order.update({
		where: { id: orderId },
		data: {
			status: status as Prisma.OrderUpdateInput["status"],
			...(trackingNumber && { trackingNumber }),
		},
		include: {
			items: {
				include: {
					product: {
						select: {
							name: true,
							slug: true,
						},
					},
				},
			},
			user: {
				select: {
					name: true,
					email: true,
					phone: true,
				},
			},
		},
	})

	// Create notification for user
	if (order.userId) {
		await prisma.notification.create({
			data: {
				userId: order.userId,
				type: "ORDER_STATUS",
				message: `Order #${order.id.slice(-8).toUpperCase()} status updated to ${status}.`,
			},
		})
	}

	// Send SMS notification if phone number exists
	if (order.user?.phone) {
		try {
			await sendOrderStatusUpdate(
				order.user.phone,
				order.id.slice(-8).toUpperCase(),
				status,
			)
		} catch (error) {
			console.error("Failed to send SMS notification:", error)
		}
	}

	// Send WhatsApp notification if phone number exists
	if (order.user?.phone) {
		try {
			const statusMessages: Record<string, string> = {
				CONFIRMED: "Your order has been confirmed and is being prepared.",
				PROCESSING: "We are processing your order.",
				SHIPPED: `Your order has been shipped! Tracking number: ${trackingNumber || "N/A"}`,
				OUT_FOR_DELIVERY: "Your order is out for delivery and will arrive today!",
				DELIVERED: "Your order has been delivered. Thank you for shopping with us!",
				CANCELLED: "Your order has been cancelled. Contact support for assistance.",
			}

			const message =
				statusMessages[status] ||
				`Your order #${order.id.slice(-8).toUpperCase()} status: ${status}`

			await sendWhatsAppMessage({
				to: order.user.phone,
				message: `ElectroBuy Order Update\n\nOrder: #${order.id.slice(-8).toUpperCase()}\nStatus: ${status.replace(/_/g, " ")}\n\n${message}\n\nTrack: ${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${order.id}/track`,
			})
		} catch (error) {
			console.error("Failed to send WhatsApp notification:", error)
		}
	}

	return order
}

export async function getAllOrders(page = 1, limit = 20, status?: string) {
	const skip = (page - 1) * limit
	const where: Prisma.OrderWhereInput = {}
	if (status) {
		where.status = status as Prisma.OrderWhereInput["status"]
	}

	const [orders, total] = await Promise.all([
		prisma.order.findMany({
			where,
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
				user: {
					select: {
						name: true,
						email: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.order.count({ where }),
	])

	return {
		orders,
		total,
		page,
		totalPages: Math.ceil(total / limit),
	}
}

export async function getOrderStats() {
	const [
		totalOrders,
		pendingOrders,
		confirmedOrders,
		processingOrders,
		shippedOrders,
		deliveredOrders,
		cancelledOrders,
		totalRevenue,
	] = await Promise.all([
		prisma.order.count(),
		prisma.order.count({ where: { status: "PENDING" } }),
		prisma.order.count({ where: { status: "CONFIRMED" } }),
		prisma.order.count({ where: { status: "PROCESSING" } }),
		prisma.order.count({ where: { status: "SHIPPED" } }),
		prisma.order.count({ where: { status: "DELIVERED" } }),
		prisma.order.count({ where: { status: "CANCELLED" } }),
		prisma.order.aggregate({
			_sum: { total: true },
			where: { status: { not: "CANCELLED" } },
		}),
	])

	return {
		totalOrders,
		pendingOrders,
		confirmedOrders,
		processingOrders,
		shippedOrders,
		deliveredOrders,
		cancelledOrders,
		totalRevenue: totalRevenue._sum.total || 0,
	}
}