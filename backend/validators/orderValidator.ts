import { z } from "zod"

export const orderSchema = z.object({
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

export const orderStatusSchema = z.object({
	status: z.enum([
		"PENDING",
		"CONFIRMED",
		"PROCESSING",
		"SHIPPED",
		"OUT_FOR_DELIVERY",
		"DELIVERED",
		"CANCELLED",
	]),
	trackingNumber: z.string().optional(),
})

export type OrderInput = z.infer<typeof orderSchema>
export type OrderStatusInput = z.infer<typeof orderStatusSchema>