import { z } from "zod"

export const contactSchema = z.object({
	name: z.string().trim().min(2).max(120),
	email: z.string().trim().email().max(254),
	phone: z.string().trim().max(40).optional(),
	subject: z.string().trim().min(3).max(160),
	message: z.string().trim().min(10).max(4000),
	orderNumber: z.string().trim().max(80).optional(),
	category: z.enum(["technical", "billing", "shipping", "product", "other"]).optional(),
	website: z.string().max(120).optional(),
})

export const ticketSchema = z.object({
	customerName: z.string().trim().min(2).max(120),
	customerEmail: z.string().trim().email().max(254),
	customerPhone: z.string().trim().max(40).optional(),
	subject: z.string().trim().min(3).max(160),
	description: z.string().trim().min(10).max(4000),
	category: z.enum(["technical", "billing", "shipping", "product", "other"]),
	priority: z.enum(["low", "medium", "high", "urgent"]),
	orderId: z.string().optional(),
	attachments: z.array(z.string().url()).optional(),
})

export const updateTicketSchema = z.object({
	status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]).optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	assignedTo: z.string().trim().max(100).optional(),
	reply: z.string().trim().max(4000).optional(),
})

export const ticketReplySchema = z.object({
	reply: z.string().trim().min(1).max(4000),
})

export type ContactInput = z.infer<typeof contactSchema>
export type TicketInput = z.infer<typeof ticketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
