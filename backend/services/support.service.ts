import prisma from "../lib/db"
import { sendEmail } from "../lib/email"
import { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client"
import { PLATFORM_SUPPORT_EMAIL } from "../lib/brand"
import { normalizePagination } from "../lib/pagination"

const SUPPORT_EMAIL = PLATFORM_SUPPORT_EMAIL

export interface SupportTicketData {
	tenantId: string
	customerName: string
	customerEmail: string
	customerPhone: string
	subject: string
	description: string
	category: "technical" | "billing" | "shipping" | "product" | "other"
	priority: "low" | "medium" | "high" | "urgent"
	orderId?: string
	attachments?: string[]
}

export interface UpdateTicketData {
	status?: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed"
	priority?: "low" | "medium" | "high" | "urgent"
	assignedTo?: string
	reply?: string
}

export async function getAllTickets(filters?: {
	tenantId: string
	status?: string
	priority?: string
	category?: string
	search?: string
	page?: number
	limit?: number
}) {
	const pagination = normalizePagination(filters?.page, filters?.limit)
	const page = pagination.page
	const limit = pagination.limit
	const skip = pagination.skip

	const where: any = { tenantId: filters?.tenantId }

	if (filters?.status && filters.status !== "All") {
		where.status = filters.status.toLowerCase().replace(" ", "_")
	}
	if (filters?.priority && filters.priority !== "All") {
		where.priority = filters.priority.toLowerCase()
	}
	if (filters?.category && filters.category !== "All") {
		where.category = filters.category.toLowerCase()
	}
	if (filters?.search) {
		where.OR = [
			{ subject: { contains: filters.search, mode: "insensitive" } },
			{ customerName: { contains: filters.search, mode: "insensitive" } },
			{ description: { contains: filters.search, mode: "insensitive" } },
		]
	}

	const [tickets, total] = await Promise.all([
		prisma.supportTicket.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.supportTicket.count({ where }),
	])

	return {
		tickets,
		total,
		page,
		totalPages: Math.ceil(total / limit),
	}
}

export async function getTicketById(id: string, tenantId: string) {
	const ticket = await prisma.supportTicket.findFirst({
		where: { id, tenantId },
		include: {
			replies: {
				orderBy: { createdAt: "asc" },
			},
		},
	})

	if (!ticket) {
		throw new Error("Ticket not found")
	}

	return ticket
}

export async function createTicket(data: SupportTicketData) {
	const ticket = await prisma.supportTicket.create({
		data: {
			tenantId: data.tenantId,
			customerName: data.customerName,
			customerEmail: data.customerEmail,
			customerPhone: data.customerPhone,
			subject: data.subject,
			description: data.description,
			category: data.category.toUpperCase() as TicketCategory,
			priority: data.priority.toUpperCase() as TicketPriority,
			orderId: data.orderId,
			attachments: data.attachments || [],
			status: TicketStatus.OPEN,
		},
		include: {
			replies: true,
		},
	})

	// Send email notification to support team (non-blocking)
	try {
		await sendEmail({
			to: SUPPORT_EMAIL,
			subject: `New Support Ticket: ${ticket.subject}`,
			html: `
				<h2>New Support Request</h2>
				<p><strong>Ticket ID:</strong> ${ticket.id}</p>
				<p><strong>Name:</strong> ${ticket.customerName}</p>
				<p><strong>Email:</strong> ${ticket.customerEmail}</p>
				<p><strong>Phone:</strong> ${ticket.customerPhone || "N/A"}</p>
				<p><strong>Category:</strong> ${ticket.category}</p>
				<p><strong>Priority:</strong> ${ticket.priority}</p>
				${ticket.orderId ? `<p><strong>Order:</strong> ${ticket.orderId}</p>` : ""}
				<p><strong>Subject:</strong> ${ticket.subject}</p>
				<p><strong>Message:</strong> ${ticket.description}</p>
			`,
		})
	} catch (emailError) {
		console.error("Failed to send support team notification:", emailError)
	}

	// Send confirmation email to customer (non-blocking)
	try {
		await sendEmail({
			to: ticket.customerEmail,
			subject: `We received your request: ${ticket.subject}`,
			html: `
				<h2>Hello ${ticket.customerName},</h2>
				<p>Thank you for contacting ElectroBuy support. We have received your request and our team will get back to you within 24 hours.</p>
				<p><strong>Ticket ID:</strong> ${ticket.id}</p>
				<p><strong>Subject:</strong> ${ticket.subject}</p>
				<p><strong>Priority:</strong> ${ticket.priority}</p>
				<p>You can reply to this email to provide additional information.</p>
			`,
		})
	} catch (emailError) {
		console.error("Failed to send customer confirmation email:", emailError)
	}

	return ticket
}

export async function updateTicket(id: string, tenantId: string, data: UpdateTicketData) {
	const existing = await prisma.supportTicket.findFirst({ where: { id, tenantId }, select: { id: true } })
	if (!existing) throw new Error("Ticket not found")
	const ticket = await prisma.supportTicket.update({
		where: { id: existing.id },
		data: {
			...(data.status && {
				status: data.status.toUpperCase() as TicketStatus,
			}),
			...(data.priority && {
				priority: data.priority.toUpperCase() as TicketPriority,
			}),
			...(data.assignedTo && { assignedTo: data.assignedTo }),
			updatedAt: new Date(),
		},
		include: {
			replies: {
				orderBy: { createdAt: "desc" },
			},
		},
	})

	// Send notification to customer about status update (non-blocking)
	if (data.status) {
		try {
			const statusLabels: Record<string, string> = {
				open: "Open",
				in_progress: "In Progress",
				waiting_customer: "Waiting for your response",
				resolved: "Resolved",
				closed: "Closed",
			}

			await sendEmail({
				to: ticket.customerEmail,
				subject: `Support Ticket #${ticket.id.slice(-8).toUpperCase()} status updated`,
				html: `
					<h2>Hello ${ticket.customerName},</h2>
					<p>Your support ticket regarding <strong>"${ticket.subject}"</strong> has been updated to status: <strong>${statusLabels[data.status] || data.status}</strong>.</p>
					<p><strong>Ticket ID:</strong> ${ticket.id}</p>
					<p>If you have any questions, please reply to this email.</p>
				`,
			})
		} catch (emailError) {
			console.error("Failed to send status update email:", emailError)
		}
	}

	return ticket
}

export async function addTicketReply(ticketId: string, tenantId: string, reply: string, isAdmin: boolean = false) {
	const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, tenantId }, select: { id: true, customerName: true, customerEmail: true, subject: true } })
	if (!ticket) throw new Error("Ticket not found")
	const ticketReply = await prisma.ticketReply.create({
		data: {
			tenantId,
			ticketId,
			reply,
			isAdmin,
		},
	})

	// Send email notification to customer about new reply (admin replies only)
	if (isAdmin) {
		try {
			if (ticket) {
				await sendEmail({
					to: ticket.customerEmail,
					subject: `New reply on your support ticket #${ticket.id.slice(-8).toUpperCase()}`,
					html: `
						<h2>Hello ${ticket.customerName},</h2>
						<p>You have a new reply on your support ticket regarding <strong>"${ticket.subject}"</strong>:</p>
						<div style="background: #f9fafb; border-left: 4px solid #0070f3; padding: 16px; margin: 16px 0;">
							${reply}
						</div>
						<p><strong>Ticket ID:</strong> ${ticket.id}</p>
						<p>Reply to this email to continue the conversation.</p>
					`,
				})
			}
		} catch (emailError) {
			console.error("Failed to send reply notification email:", emailError)
		}
	}

	return ticketReply
}

export async function getTicketStats(tenantId: string) {
	const [total, open, inProgress, waiting, resolved, closed] = await Promise.all([
		prisma.supportTicket.count({ where: { tenantId } }),
		prisma.supportTicket.count({ where: { tenantId, status: TicketStatus.OPEN } }),
		prisma.supportTicket.count({ where: { tenantId, status: TicketStatus.IN_PROGRESS } }),
		prisma.supportTicket.count({ where: { tenantId, status: TicketStatus.WAITING_CUSTOMER } }),
		prisma.supportTicket.count({ where: { tenantId, status: TicketStatus.RESOLVED } }),
		prisma.supportTicket.count({ where: { tenantId, status: TicketStatus.CLOSED } }),
	])

	return {
		total,
		open,
		inProgress,
		waiting,
		resolved,
		closed,
	}
}
