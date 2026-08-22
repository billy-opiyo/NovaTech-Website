import { z } from "zod"

export const merchantEnquirySchema = z.object({
	customerName: z.string().trim().min(2).max(120),
	customerEmail: z.string().trim().email().max(254),
	customerPhone: z.string().trim().max(40).optional().nullable(),
	message: z.string().trim().max(2000).optional().nullable(),
	contactMethod: z.enum(["WHATSAPP", "EMAIL"]),
	consent: z.literal(true),
	items: z.array(z.object({
		productId: z.string().min(1),
		quantity: z.number().int().min(1).max(99),
		variant: z.string().trim().max(200).optional().nullable(),
	})).min(1).max(50),
})

export const merchantEnquiryUpdateSchema = z.object({
	status: z.enum(["NEW", "CONTACTED", "QUOTED", "WON", "LOST", "SPAM"]).optional(),
	notes: z.string().trim().max(4000).nullable().optional(),
	tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
	assignedToId: z.string().min(1).nullable().optional(),
})

export const merchantQuoteSchema = z.object({
	deliveryFee: z.number().finite().min(0).max(10_000_000).default(0),
	terms: z.string().trim().max(4000).nullable().optional(),
	expiresAt: z.string().datetime().nullable().optional(),
})
