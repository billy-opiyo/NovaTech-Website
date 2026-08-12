import { apiFetch } from "./api"

export interface CartItem {
	id: string
	productId: string
	name: string
	brand: string
	image: string
	price: number
	quantity: number
	variant?: string
	maxStock: number
	slug: string
}

export interface CartResponse {
	items: CartItem[]
	subtotal: number
	shippingEstimate: number
	total: number
}

export async function getCart(): Promise<CartResponse> {
	return apiFetch<CartResponse>("/api/cart")
}

export async function addToCart(
	productId: string,
	quantity: number,
	variant?: string,
): Promise<CartResponse> {
	return apiFetch<CartResponse>("/api/cart", {
		method: "POST",
		body: JSON.stringify({ productId, quantity, variant }),
	})
}

export async function updateCartItem(
	itemId: string,
	quantity: number,
): Promise<CartResponse> {
	return apiFetch<CartResponse>(`/api/cart/${itemId}`, {
		method: "PATCH",
		body: JSON.stringify({ quantity }),
	})
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
	return apiFetch<CartResponse>(`/api/cart/${itemId}`, {
		method: "DELETE",
	})
}

export async function clearCart(): Promise<CartResponse> {
	return apiFetch<CartResponse>("/api/cart", {
		method: "DELETE",
	})
}