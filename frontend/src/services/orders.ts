import { apiFetch } from "./api"

export interface OrderItem {
	id: string
	productId: string
	quantity: number
	price: number
	variant?: string | null
	product?: {
		name: string
		slug: string
		images: string[]
		brand?: string
	}
}

export interface Order {
	id: string
	status: string
	subtotal: number
	shippingCost: number
	total: number
	paymentMethod?: string | null
	trackingNumber?: string | null
	notes?: string | null
	createdAt: string
	updatedAt: string
	items: OrderItem[]
	shippingAddress?: {
		fullName: string
		phone: string
		email: string
		county: string
		town: string
		address: string
		landmark?: string
	}
}

export interface OrderListResponse {
	orders: Order[]
	total: number
	page: number
	totalPages: number
}

export interface CreateOrderInput {
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

export async function getMyOrders(page = 1, limit = 20): Promise<OrderListResponse> {
	return apiFetch<OrderListResponse>(`/api/orders?page=${page}&limit=${limit}`)
}

export async function getOrderById(id: string): Promise<Order> {
	return apiFetch<Order>(`/api/orders/${id}`)
}

export async function createOrder(data: CreateOrderInput): Promise<Order> {
	return apiFetch<Order>("/api/orders", {
		method: "POST",
		body: JSON.stringify(data),
	})
}

export async function updateOrderStatus(
	id: string,
	status: string,
	trackingNumber?: string,
): Promise<Order> {
	return apiFetch<Order>(`/api/orders/${id}`, {
		method: "PATCH",
		body: JSON.stringify({ status, trackingNumber }),
	})
}

export async function getOrderTracking(id: string) {
	return apiFetch<Record<string, unknown>>(`/api/orders/${id}/tracking`)
}