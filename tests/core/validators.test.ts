import { test } from "node:test"
import assert from "node:assert/strict"
import { registerSchema, loginSchema } from "../../backend/validators/authValidator"
import { orderSchema, orderStatusSchema } from "../../backend/validators/orderValidator"
import { productSchema } from "../../backend/validators/productValidator"
import { reviewSchema, updateReviewSchema, deleteReviewSchema } from "../../backend/validators/reviewValidator"
import { contactSchema, ticketSchema, updateTicketSchema, ticketReplySchema } from "../../backend/validators/supportValidator"
import { resolveVariantSelection } from "../../backend/lib/product-variant"

test("auth schemas accept valid credentials and reject malformed input", () => {
	assert.equal(registerSchema.safeParse({ name: "Ada Lovelace", email: "ada@example.com", password: "Password1" }).success, true)
	assert.equal(registerSchema.safeParse({ name: "A", email: "bad", password: "short" }).success, false)
	assert.equal(loginSchema.safeParse({ email: "ada@example.com", password: "x" }).success, true)
	assert.equal(loginSchema.safeParse({ email: "bad", password: "" }).success, false)
})

const order = {
	items: [{ productId: "p1", quantity: 2, variant: "Black" }],
	shippingAddress: { fullName: "Ada", phone: "0712345678", email: "ada@example.com", county: "Nairobi", town: "Westlands", address: "1 Main St" },
	deliveryMethod: "standard", paymentMethod: "mpesa", subtotal: 2000, shippingCost: 500, total: 2500,
}

test("order schemas validate checkout payloads and status transitions", () => {
	assert.equal(orderSchema.safeParse(order).success, true)
	assert.equal(orderSchema.safeParse({ ...order, items: [{ productId: "p1", quantity: 0 }] }).success, false)
	assert.equal(orderStatusSchema.safeParse({ status: "SHIPPED", trackingNumber: "TRK-1" }).success, true)
	assert.equal(orderStatusSchema.safeParse({ status: "UNKNOWN" }).success, false)
})

test("product schema validates slugs, stock, variants, and image URLs", () => {
	const product = { name: "Nova Phone", slug: "nova-phone", description: "A useful phone for everyday work", brand: "Nova", sku: "NP-1", price: 1000, stock: 5, images: ["https://example.com/p.jpg"], categoryId: "phones", variants: [{ name: "Color", value: "Blue", stock: 2 }] }
	assert.equal(productSchema.safeParse(product).success, true)
	assert.equal(productSchema.safeParse({ ...product, slug: "Not Valid" }).success, false)
	assert.equal(productSchema.safeParse({ ...product, images: ["not-a-url"] }).success, false)
})

test("variant selection applies variant price and stock without allowing duplicate option groups", () => {
	const variants = [
		{ id: "red", name: "Color", value: "Red", priceModifier: 100, stock: 3 },
		{ id: "128", name: "Storage", value: "128GB", priceModifier: 500, stock: 2 },
	]
	const selected = resolveVariantSelection(variants, "Color: Red / Storage: 128GB")
	assert.equal(selected.valid, true)
	assert.equal(selected.priceModifier, 600)
	assert.equal(selected.stock, 2)
	assert.equal(resolveVariantSelection(variants, "Color: Red / Color: Red").valid, false)
})

test("review and support schemas enforce required fields and enums", () => {
	assert.equal(reviewSchema.safeParse({ productId: "p1", rating: 5, comment: "Excellent product!" }).success, true)
	assert.equal(reviewSchema.safeParse({ productId: "p1", rating: 6 }).success, false)
	assert.equal(updateReviewSchema.safeParse({ reviewId: "r1", title: "Updated" }).success, true)
	assert.equal(deleteReviewSchema.safeParse({ reviewId: "r1" }).success, true)
	assert.equal(contactSchema.safeParse({ name: "Ada", email: "ada@example.com", subject: "Shipping", message: "Please confirm delivery timing." }).success, true)
	assert.equal(ticketSchema.safeParse({ customerName: "Ada", customerEmail: "ada@example.com", subject: "Help", description: "I need help with my order.", category: "shipping", priority: "high" }).success, true)
	assert.equal(updateTicketSchema.safeParse({ status: "resolved", priority: "urgent" }).success, true)
	assert.equal(ticketReplySchema.safeParse({ reply: "Thanks" }).success, true)
	assert.equal(ticketReplySchema.safeParse({ reply: "" }).success, false)
})
