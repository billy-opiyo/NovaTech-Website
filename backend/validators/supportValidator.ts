import { z } from "zod"

export const contactSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	phone: z.string().optional(),
	subject: z.string().min(3),
	message: z.string().min(10),
	orderNumber: z.string().optional(),
	category: z.enum(["technical", "billing", "shipping", "product", "other"]).optional(),
})

export const ticketSchema = z.object({
	customerName: z.string().min(2),
	customerEmail: z.string().email(),
	customerPhone: z.string().optional(),
	subject: z.string().min(3),
	description: z.string().min(10),
	category: z.enum(["technical", "billing", "shipping", "product", "other"]),
	priority: z.enum(["low", "medium", "high", "urgent"]),
	orderId: z.string().optional(),
	attachments: z.array(z.string().url()).optional(),
})

export const updateTicketSchema = z.object({
	status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]).optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	assignedTo: z.string().optional(),
	reply: z.string().optional(),
})

export const ticketReplySchema = z.object({
	reply: z.string().min(1),
})

export type ContactInput = z.infer<typeof contactSchema>
export type TicketInput = z.infer<typeof ticketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>