import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as orderService from "../services/order.service"
import { orderSchema, orderStatusSchema } from "../validators/orderValidator"
import { z } from "zod"
import { createActionRecord } from "../actions"
import { resolveTenantFromRequest } from "../lib/tenant"
import { requireMembership } from "../lib/tenant-access"
import { MembershipRole } from "@prisma/client"

export async function getOrders(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const url = new URL(req.url)
		const page = parseInt(url.searchParams.get("page") || "1", 10)
		const limit = parseInt(url.searchParams.get("limit") || "20", 10)

		const context = await resolveTenantFromRequest(req)
		const result = await orderService.getOrdersByUserId(session.user.id!, context.tenantId, page, limit)
		return NextResponse.json(result)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function createOrder(req: NextRequest) {
	try {
		const session = await getServerSession()
		const body = await req.json()
		const validated = orderSchema.parse(body)
		const context = await resolveTenantFromRequest(req)

		const order = await orderService.createOrder({
			tenantId: context.tenantId,
			userId: session?.user?.id || undefined,
			guestEmail: !session?.user ? validated.shippingAddress.email : undefined,
			items: validated.items,
			shippingAddress: validated.shippingAddress,
			deliveryMethod: validated.deliveryMethod,
			paymentMethod: validated.paymentMethod,
			subtotal: validated.subtotal,
			shippingCost: validated.shippingCost,
			total: validated.total,
			couponCode: validated.couponCode,
			notes: validated.notes,
			idempotencyKey: req.headers.get("idempotency-key") || undefined,
		})

		// Send order confirmation email (non-blocking - don't fail the order if email fails)
		try {
			const { sendOrderConfirmationEmail } = await import("../lib/email")
			await sendOrderConfirmationEmail(validated.shippingAddress.email, order)
		} catch (emailError) {
			console.error("Failed to send order confirmation email:", emailError)
		}

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

export async function getOrderById(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const { id } = await params
		const context = await resolveTenantFromRequest(req)
		const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN" || !!session.user.platformRole
		const order = await orderService.getOrderById(id, context.tenantId, isAdmin ? undefined : session.user.id!)

		// Allow admins to view any order
		if (!isAdmin && order.userId !== session.user.id) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		return NextResponse.json(order)
	} catch (error: any) {
		return NextResponse.json(
			{ message: error.message },
			{ status: error.message === "Order not found" ? 404 : 500 },
		)
	}
}

export async function updateOrderStatus(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getServerSession()
		if (
			!session?.user ||
			(session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
		) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const { id } = await params
		const body = await req.json()
		const validated = orderStatusSchema.parse(body)

		const context = await resolveTenantFromRequest(req)
		await requireMembership(session.user.id, context.tenantId, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])
		const order = await orderService.updateOrderStatus(
			id,
			validated.status,
			context.tenantId,
			validated.trackingNumber,
		)
		await createActionRecord("UPDATED_ORDER_STATUS", { adminId: session.user.id, orderId: id, status: validated.status })

		return NextResponse.json(order)
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

export async function getAllOrders(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (
			!session?.user ||
			(session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
		) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const url = new URL(req.url)
		const page = parseInt(url.searchParams.get("page") || "1", 10)
		const limit = parseInt(url.searchParams.get("limit") || "20", 10)
		const status = url.searchParams.get("status") || undefined

		const context = await resolveTenantFromRequest(req)
		await requireMembership(session.user.id, context.tenantId, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT])
		const result = await orderService.getAllOrders(context.tenantId, page, limit, status)
		return NextResponse.json(result)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function getOrderStats(req?: NextRequest) {
	try {
		const session = await getServerSession()
		if (
			!session?.user ||
			(session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
		) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const context = await resolveTenantFromRequest(req || new NextRequest("http://localhost"))
		const stats = await orderService.getOrderStats(context.tenantId)
		return NextResponse.json(stats)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
