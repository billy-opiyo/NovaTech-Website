import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as orderService from "../services/order.service"
import { orderSchema, orderStatusSchema } from "../validators/orderValidator"
import { z } from "zod"
import { createActionRecord } from "../actions"
import { resolveTenantFromRequest } from "../lib/tenant"
import { requireMembership, requireStorePermission } from "../lib/tenant-access"
import { SHOPPER_COMMERCE_DISABLED_MESSAGE, isShopperCheckoutEnabled } from "../lib/commerce-model"
import { parsePagination } from "../lib/pagination"
import { apiErrorResponse } from "../lib/api-handler"
import { getMerchantMpesaConfig } from "../payments/merchant-mpesa"
import { createOrderIdempotencyKey } from "../lib/order-idempotency"

export async function getOrders(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const url = new URL(req.url)
		const { page, limit } = parsePagination(url.searchParams)

		const context = await resolveTenantFromRequest(req)
		const result = await orderService.getOrdersByUserId(session.user.id!, context.tenantId, page, limit)
		return NextResponse.json(result)
	} catch (error: unknown) {
		return apiErrorResponse(error, "Orders unavailable")
	}
}

export async function createOrder(req: NextRequest) {
	try {
		if (!isShopperCheckoutEnabled()) {
			return NextResponse.json({ code: "MERCHANT_DIRECT_SALES", message: SHOPPER_COMMERCE_DISABLED_MESSAGE }, { status: 410 })
		}
		const session = await getServerSession()
		const body = await req.json()
		const validated = orderSchema.parse(body)
		const context = await resolveTenantFromRequest(req)
		if (validated.paymentMethod === "MPESA" && !await getMerchantMpesaConfig(context.tenantId)) return NextResponse.json({ code: "MERCHANT_MPESA_NOT_READY", message: "This store has not completed its verified M-Pesa shopper payment setup." }, { status: 409 })

		const rawIdempotencyKey = req.headers.get("idempotency-key")?.trim()
		const ownerScope = session?.user?.id ? `user:${session.user.id}` : `guest:${validated.shippingAddress.email.trim().toLowerCase()}`
		const idempotencyKey = rawIdempotencyKey
			? createOrderIdempotencyKey({ tenantId: context.tenantId, ownerScope, clientKey: rawIdempotencyKey, checkout: validated })
			: undefined
		const order = await orderService.createOrder({
			tenantId: context.tenantId,
			userId: session?.user?.id || undefined,
			guestEmail: !session?.user ? validated.shippingAddress.email : undefined,
			items: validated.items,
			shippingAddress: validated.shippingAddress,
			deliveryMethod: validated.deliveryMethod,
			paymentMethod: validated.paymentMethod,
			couponCode: validated.couponCode,
			notes: validated.notes,
			idempotencyKey,
		})

		const ownsOrder = session?.user?.id
			? order.userId === session.user.id
			: !order.userId && order.guestEmail?.trim().toLowerCase() === validated.shippingAddress.email.trim().toLowerCase()
		if (!ownsOrder) return NextResponse.json({ message: "This idempotency key is already associated with another checkout." }, { status: 409 })
		const storedShipping = order.shippingAddress as typeof validated.shippingAddress
		const shippingMatches = ["fullName", "phone", "email", "county", "town", "address", "landmark"].every((key) => {
			const storedValue = storedShipping?.[key as keyof typeof validated.shippingAddress] || ""
			const requestedValue = validated.shippingAddress[key as keyof typeof validated.shippingAddress] || ""
			return String(storedValue).trim().toLowerCase() === String(requestedValue).trim().toLowerCase()
		})
		const itemFingerprint = (items: Array<{ productId: string; quantity: number; variant?: string | null }>) => items.map((item) => `${item.productId}:${item.quantity}:${item.variant || ""}`).sort().join("|")
		if (order.paymentMethod !== validated.paymentMethod || !shippingMatches || itemFingerprint(order.items) !== itemFingerprint(validated.items)) {
			return NextResponse.json({ message: "This idempotency key was already used for different checkout details." }, { status: 409 })
		}

		return NextResponse.json(order, { status: 201 })
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			const details = error.errors
				.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
				.join("; ")
			return NextResponse.json(
				{ code: "ORDER_VALIDATION_ERROR", message: `Order details need correction: ${details}`, errors: error.errors },
				{ status: 400 },
			)
		}
		return apiErrorResponse(error, "Unable to create order")
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
		let canManageOrders = false
		try {
			await requireStorePermission(session.user.id!, context.tenantId, "VIEW_ORDERS")
			canManageOrders = true
		} catch {
			// Shoppers may still read their own order in this store.
		}
		const order = await orderService.getOrderById(id, context.tenantId, canManageOrders ? undefined : session.user.id!)

		if (!canManageOrders && order.userId !== session.user.id) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		return NextResponse.json(order)
	} catch (error: unknown) {
		return apiErrorResponse(error, "Order unavailable")
	}
}

export async function updateOrderStatus(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getServerSession()
		if (!session?.user?.id) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const { id } = await params
		const body = await req.json()
		const validated = orderStatusSchema.parse(body)

		const context = await resolveTenantFromRequest(req)
		await requireStorePermission(session.user.id, context.tenantId, "UPDATE_ORDERS")
		const order = await orderService.updateOrderStatus(
			id,
			validated.status,
			context.tenantId,
			validated.trackingNumber,
		)
		await createActionRecord("UPDATED_ORDER_STATUS", { adminId: session.user.id, tenantId: context.tenantId, orderId: id, status: validated.status })

		return NextResponse.json(order)
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return apiErrorResponse(error, "Unable to update order")
	}
}

export async function getAllOrders(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user?.id) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const url = new URL(req.url)
		const { page, limit } = parsePagination(url.searchParams)
		const status = url.searchParams.get("status") || undefined

		const context = await resolveTenantFromRequest(req)
		await requireStorePermission(session.user.id, context.tenantId, "VIEW_ORDERS")
		const result = await orderService.getAllOrders(context.tenantId, page, limit, status)
		return NextResponse.json(result)
	} catch (error: unknown) {
		return apiErrorResponse(error, "Orders unavailable")
	}
}

export async function getOrderStats(req?: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user?.id || !req) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const context = await resolveTenantFromRequest(req)
		await requireStorePermission(session.user.id, context.tenantId, "VIEW_ORDERS")
		const stats = await orderService.getOrderStats(context.tenantId)
		return NextResponse.json(stats)
	} catch (error: unknown) {
		return apiErrorResponse(error, "Order statistics unavailable")
	}
}
