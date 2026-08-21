import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { getOrderById } from "backend/services/order.service"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const { id: orderId } = await params
		const context = await resolveTenantFromRequest(req)
		const order = await getOrderById(orderId, context.tenantId, session.user.id)
		if (!order.shippingAddress) {
			return NextResponse.json({ message: "Order has no shipping address" }, { status: 422 })
		}
		const shippingAddress = order.shippingAddress as {
			county: string
			address: string
			fullName: string
			email: string
			phone: string
			town: string
		}

		// Build tracking history from order status and timestamps
		const trackingHistory = []
		
		// Add order placement event
		trackingHistory.push({
			status: "pending",
			timestamp: order.createdAt.toISOString(),
			description: "Order placed successfully",
			location: "Online",
		})

		// Add status update events based on order status
		if (["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
			trackingHistory.push({
				status: "confirmed",
				timestamp: order.updatedAt.toISOString(),
				description: "Payment confirmed, order processing",
				location: "Warehouse",
			})
		}

		if (["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
			trackingHistory.push({
				status: "processing",
				timestamp: order.updatedAt.toISOString(),
				description: "Order packed and ready for shipping",
				location: "Warehouse",
			})
		}

		if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
			trackingHistory.push({
				status: "shipped",
				timestamp: order.updatedAt.toISOString(),
				description: order.trackingNumber 
					? `Package dispatched via courier. Tracking: ${order.trackingNumber}`
					: "Package dispatched via courier",
				location: "Distribution Center",
			})
		}

		if (["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
			trackingHistory.push({
				status: "out_for_delivery",
				timestamp: order.updatedAt.toISOString(),
				description: "Out for delivery - Courier assigned",
				location: shippingAddress.county,
			})
		}

		if (order.status === "DELIVERED") {
			trackingHistory.push({
				status: "delivered",
				timestamp: order.updatedAt.toISOString(),
				description: "Package delivered successfully",
				location: shippingAddress.address,
			})
		}

		// Estimate delivery date (7 days from order date for standard delivery)
		const estimatedDelivery = new Date(order.createdAt)
		estimatedDelivery.setDate(estimatedDelivery.getDate() + 7)

		return NextResponse.json({
			id: order.id,
			status: order.status.toLowerCase(),
			trackingNumber: order.trackingNumber,
			estimatedDelivery: estimatedDelivery.toISOString(),
			courierService: "Standard Courier",
			trackingHistory,
			customerName: shippingAddress.fullName,
			customerEmail: shippingAddress.email,
			customerPhone: shippingAddress.phone,
			shippingAddress: {
				county: shippingAddress.county,
				town: shippingAddress.town,
				streetAddress: shippingAddress.address,
			},
		})
	} catch (error: unknown) {
		console.error("Tracking API error:", error)
		const message = error instanceof Error ? error.message : "Failed to fetch tracking information"
		const status = message === "Order not found" ? 404 : message === "Unauthorized" ? 403 : 500
		return NextResponse.json(
			{ message: status === 500 ? "Failed to fetch tracking information" : message },
			{ status },
		)
	}
}
