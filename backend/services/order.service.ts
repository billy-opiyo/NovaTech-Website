import prisma from "../lib/db"
import { normalizePagination } from "../lib/pagination"
import { Prisma } from "@prisma/client"
import { sendOrderStatusUpdate } from "../notifications/sms"
import { sendWhatsAppMessage } from "../notifications/whatsapp"
import { PLATFORM_BRAND_NAME } from "../lib/brand"
import { getTenantEntitlement } from "../billing/subscription"
import { resolveVariantSelection } from "../lib/product-variant"

export interface CreateOrderData {
	tenantId: string
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
	idempotencyKey?: string
}

export async function createOrder(data: CreateOrderData) {
	return prisma.$transaction(async (tx) => {
		if (!data.items.length) throw new Error("At least one item is required")
		if (data.idempotencyKey) {
			const existing = await tx.order.findFirst({ where: { idempotencyKey: data.idempotencyKey, tenantId: data.tenantId }, include: { items: { where: { tenantId: data.tenantId }, include: { product: { select: { name: true, slug: true, images: true } } } } } })
			if (existing) return existing
		}

		// Prices, discounts, shipping, and stock are authoritative on the server.
		const products = await Promise.all(
			data.items.map((item) => tx.product.findFirst({
				where: { id: item.productId, tenantId: data.tenantId },
				select: {
					id: true,
					stock: true,
					name: true,
					price: true,
					discountedPrice: true,
					variants: { where: { tenantId: data.tenantId }, select: { id: true, name: true, value: true, priceModifier: true, stock: true } },
				},
			})),
		)
		const productById = new Map(products.filter(Boolean).map((product) => [product!.id, product!]))
		let subtotal = 0
		const requestedQuantities = new Map<string, number>()
		const requestedVariantQuantities = new Map<string, number>()
		const resolvedItems: { productId: string; quantity: number; variant?: string; price: number }[] = []
		for (const item of data.items) {
			if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error("Order quantities must be positive integers")
			const product = productById.get(item.productId)
			if (!product) {
				throw new Error(`Product not found: ${item.productId}`)
			}
			const selectedVariant = resolveVariantSelection(product.variants, item.variant)
			if (!selectedVariant.valid) throw new Error(`Selected variant is unavailable for ${product.name}`)
			const unitPrice = (product.discountedPrice ?? product.price) + selectedVariant.priceModifier
			const availableStock = selectedVariant.stock ?? product.stock
			if (availableStock < item.quantity) {
				throw new Error(
					`Insufficient stock for ${product.name}. Available: ${availableStock}`,
				)
			}
			if (selectedVariant.selected.length > 0) {
				for (const variant of selectedVariant.selected) {
					if (!variant.id) throw new Error(`Selected variant is unavailable for ${product.name}`)
					requestedVariantQuantities.set(variant.id, (requestedVariantQuantities.get(variant.id) || 0) + item.quantity)
				}
			} else {
				requestedQuantities.set(item.productId, (requestedQuantities.get(item.productId) || 0) + item.quantity)
			}
			resolvedItems.push({ productId: item.productId, quantity: item.quantity, variant: item.variant, price: unitPrice })
			subtotal += unitPrice * item.quantity
		}

		let discount = 0
		let couponUsedCount: number | undefined
		if (data.couponCode) {
			const coupon = await tx.coupon.findFirst({ where: { code: data.couponCode.trim().toUpperCase(), tenantId: data.tenantId } })
			if (!coupon || !coupon.isActive || coupon.expiresAt < new Date() || (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)) {
				throw new Error("Invalid or expired coupon")
			}
			if (coupon.minOrderValue && subtotal < coupon.minOrderValue) throw new Error("Order does not meet the coupon minimum")
			couponUsedCount = coupon.usedCount
			discount = Math.min(subtotal, Math.max(0, coupon.discountPercent ? subtotal * coupon.discountPercent / 100 : (coupon.discountAmount || 0)))
		}
		const store = await tx.store.findFirst({
			where: { tenantId: data.tenantId },
			select: { commerceSettings: true },
		})
		const commerceSettings = store?.commerceSettings && typeof store.commerceSettings === "object" && !Array.isArray(store.commerceSettings)
			? store.commerceSettings as Record<string, unknown>
			: {}
		const freeShippingThreshold = typeof commerceSettings.freeShippingThreshold === "number" && Number.isFinite(commerceSettings.freeShippingThreshold)
			? Math.max(0, commerceSettings.freeShippingThreshold)
			: 50000
		const defaultShippingCost = typeof commerceSettings.defaultShippingCost === "number" && Number.isFinite(commerceSettings.defaultShippingCost)
			? Math.max(0, commerceSettings.defaultShippingCost)
			: 500
		const shippingCost = subtotal - discount >= freeShippingThreshold ? 0 : data.deliveryMethod === "pickup" ? 0 : data.deliveryMethod === "express" ? 1000 : defaultShippingCost
		const total = Math.max(0, subtotal - discount + shippingCost)

		// Get product prices for order items
		const orderItems = resolvedItems.map((item) => {
				return {
					tenantId: data.tenantId,
					productId: item.productId,
					quantity: item.quantity,
					price: item.price,
					variant: item.variant,
				}
			})

		// Create order
		const order = await tx.order.create({
			data: {
				tenantId: data.tenantId,
				userId: data.userId,
				guestEmail: data.guestEmail,
				status: "PENDING",
				subtotal,
				shippingCost,
				total,
				paymentMethod: data.paymentMethod,
				shippingAddress: data.shippingAddress,
				notes: data.notes,
				idempotencyKey: data.idempotencyKey,
				items: {
					create: orderItems,
				},
			},
			include: {
				items: {
					where: { tenantId: data.tenantId },
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

		if (data.couponCode) {
			const updatedCoupon = await tx.coupon.updateMany({
				where: { tenantId: data.tenantId, code: data.couponCode.trim().toUpperCase(), usedCount: couponUsedCount },
				data: { usedCount: { increment: 1 } },
			})
			if (updatedCoupon.count !== 1) throw new Error("Coupon could not be applied to this store")
		}

		// Decrement stock atomically so concurrent checkouts cannot oversell.
		for (const [productId, quantity] of requestedQuantities) {
			const updated = await tx.product.updateMany({
				where: { id: productId, tenantId: data.tenantId, stock: { gte: quantity } },
				data: { stock: { decrement: quantity } },
			})
			if (updated.count !== 1) {
				throw new Error("Product stock changed while placing the order. Please review your cart and try again.")
			}
		}
		for (const [variantId, quantity] of requestedVariantQuantities) {
			const updated = await tx.variant.updateMany({
				where: { id: variantId, tenantId: data.tenantId, stock: { gte: quantity } },
				data: { stock: { decrement: quantity } },
			})
			if (updated.count !== 1) {
				throw new Error("Variant stock changed while placing the order. Please review your cart and try again.")
			}
		}

		// Create notification for user
		if (data.userId) {
			await tx.notification.create({
				data: {
					tenantId: data.tenantId,
					userId: data.userId,
					type: "ORDER_STATUS",
					message: `Order #${order.id.slice(-8).toUpperCase()} has been placed successfully.`,
				},
			})
		}

		return order
	})
}

export async function getOrdersByUserId(userId: string, tenantId: string, page = 1, limit = 20) {
	const pagination = normalizePagination(page, limit)
	page = pagination.page
	limit = pagination.limit
	const skip = pagination.skip

	const [orders, total] = await Promise.all([
		prisma.order.findMany({
			where: { userId, tenantId },
			include: {
				items: {
					where: { tenantId },
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
		prisma.order.count({ where: { userId, tenantId } }),
	])

	return {
		orders,
		total,
		page,
		totalPages: Math.ceil(total / limit),
	}
}

export async function getOrderById(orderId: string, tenantId: string, userId?: string) {
	const order = await prisma.order.findFirst({
		where: { id: orderId, tenantId },
		include: {
			items: {
				where: { tenantId },
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
					orderUpdates: true,
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
	tenantId: string,
	trackingNumber?: string,
) {
	const existing = await prisma.order.findFirst({ where: { id: orderId, tenantId }, select: { id: true } })
	if (!existing) throw new Error("Order not found")
	const order = await prisma.order.update({
		where: { id: existing.id },
		data: {
			status: status as Prisma.OrderUpdateInput["status"],
			...(trackingNumber && { trackingNumber }),
		},
		include: {
			items: {
				where: { tenantId },
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
					orderUpdates: true,
				},
			},
		},
	})

	// Create notification for user
	if (order.userId) {
		await prisma.notification.create({
			data: {
				tenantId,
				userId: order.userId,
				type: "ORDER_STATUS",
				message: `Order #${order.id.slice(-8).toUpperCase()} status updated to ${status}.`,
			},
		})
	}

	const shippingPhone = (order.shippingAddress as any)?.phone

	// Send SMS notification if phone number exists
	if (shippingPhone) {
		try {
			await sendOrderStatusUpdate(
				shippingPhone,
				order.id.slice(-8).toUpperCase(),
				status,
			)
		} catch (error) {
			console.error("Failed to send SMS notification:", error)
		}
	}

	// Send WhatsApp notification when the merchant has enabled the paid add-on
	const whatsappEnabled = await getTenantEntitlement(tenantId, "whatsappNotifications", false)
	if (shippingPhone && whatsappEnabled === true && order.user?.orderUpdates !== false) {
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
				to: shippingPhone.replace(/^0/, "254"),
text: `${PLATFORM_BRAND_NAME} Order Update\n\nOrder: #${order.id.slice(-8).toUpperCase()}\nStatus: ${status.replace(/_/g, " ")}\n\n${message}\n\nTrack: ${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${order.id}/track`,
			})
		} catch (error) {
			console.error("Failed to send WhatsApp notification:", error)
		}
	}

	return order
}

export async function getAllOrders(tenantId: string, page = 1, limit = 20, status?: string) {
	const pagination = normalizePagination(page, limit)
	page = pagination.page
	limit = pagination.limit
	const skip = pagination.skip
	const where: Prisma.OrderWhereInput = { tenantId }
	if (status) {
		where.status = status as Prisma.OrderWhereInput["status"]
	}

	const [orders, total] = await Promise.all([
		prisma.order.findMany({
			where,
			include: {
				items: {
					where: { tenantId },
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

export async function getOrderStats(tenantId: string) {
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
		prisma.order.count({ where: { tenantId } }),
		prisma.order.count({ where: { tenantId, status: "PENDING" } }),
		prisma.order.count({ where: { tenantId, status: "CONFIRMED" } }),
		prisma.order.count({ where: { tenantId, status: "PROCESSING" } }),
		prisma.order.count({ where: { tenantId, status: "SHIPPED" } }),
		prisma.order.count({ where: { tenantId, status: "DELIVERED" } }),
		prisma.order.count({ where: { tenantId, status: "CANCELLED" } }),
		prisma.order.aggregate({
			_sum: { total: true },
			where: { tenantId, status: { not: "CANCELLED" } },
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

export async function cancelPendingOrder(orderId: string, tenantId?: string) {
	return prisma.$transaction(async (tx) => {
		const order = await tx.order.findUnique({
			where: { id: orderId, ...(tenantId ? { tenantId } : {}) },
			include: {
				items: {
					where: tenantId ? { tenantId } : undefined,
					include: {
						product: {
							select: {
								variants: { ...(tenantId ? { where: { tenantId } } : {}), select: { id: true, name: true, value: true, priceModifier: true, stock: true } },
							},
						},
					},
				},
			},
		})
		if (!order || order.status !== "PENDING") return order

		for (const item of order.items) {
			const selectedVariant = resolveVariantSelection(item.product.variants, item.variant)
			if (!selectedVariant.valid) throw new Error("Unable to restore stock for an invalid product variant")
			if (selectedVariant.selected.length > 0) {
				for (const variant of selectedVariant.selected) {
					if (!variant.id) throw new Error("Unable to restore stock for an invalid product variant")
					await tx.variant.updateMany({ where: { id: variant.id, tenantId: order.tenantId }, data: { stock: { increment: item.quantity } } })
				}
			} else {
				await tx.product.updateMany({ where: { id: item.productId, tenantId: order.tenantId }, data: { stock: { increment: item.quantity } } })
			}
		}
		return tx.order.update({ where: { id: orderId, ...(tenantId ? { tenantId } : {}) }, data: { status: "CANCELLED" } })
	})
}
