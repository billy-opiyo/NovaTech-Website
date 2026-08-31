import { z } from "zod"

export const orderSchema = z.object({
	items: z.array(
		z.object({
			productId: z.string().trim().min(1).max(100),
			quantity: z.number().int().min(1).max(99),
			variant: z.string().trim().max(200).optional(),
		}),
	).min(1).max(50),
	shippingAddress: z.object({
		fullName: z.string().trim().min(2).max(120),
		phone: z.string().trim().min(7).max(40),
		email: z.string().trim().email().max(254),
		county: z.string().trim().min(2).max(120),
		town: z.string().trim().min(2).max(120),
		address: z.string().trim().min(2).max(300),
		landmark: z.string().trim().max(200).optional(),
	}),
	deliveryMethod: z.string().trim().min(1).max(40),
	paymentMethod: z.string().trim().min(1).max(40),
	subtotal: z.number().finite().positive(),
	shippingCost: z.number().finite().min(0).max(100000000),
	total: z.number().finite().positive().max(100000000),
	couponCode: z.string().trim().max(80).optional(),
	notes: z.string().trim().max(2000).optional(),
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
	trackingNumber: z.string().trim().max(120).optional(),
})

export type OrderInput = z.infer<typeof orderSchema>
export type OrderStatusInput = z.infer<typeof orderStatusSchema>
