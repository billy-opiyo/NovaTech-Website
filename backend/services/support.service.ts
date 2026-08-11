import prisma from "../lib/db"

export interface SupportTicketData {
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
	status?: string
	priority?: string
	category?: string
	search?: string
	page?: number
	limit?: number
}) {
	const page = filters?.page || 1
	const limit = filters?.limit || 20
	const skip = (page - 1) * limit

	const where: any = {}

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

export async function getTicketById(id: string) {
	const ticket = await prisma.supportTicket.findUnique({
		where: { id },
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
			customerName: data.customerName,
			customerEmail: data.customerEmail,
			customerPhone: data.customerPhone,
			subject: data.subject,
			description: data.description,
			category: data.category,
			priority: data.priority,
			orderId: data.orderId,
			attachments: data.attachments || [],
			status: "open",
		},
		include: {
			replies: true,
		},
	})

	// TODO: Send email notification to support team
	// TODO: Send confirmation email to customer

	return ticket
}

export async function updateTicket(id: string, data: UpdateTicketData) {
	const ticket = await prisma.supportTicket.update({
		where: { id },
		data: {
			...(data.status && { status: data.status }),
			...(data.priority && { priority: data.priority }),
			...(data.assignedTo && { assignedTo: data.assignedTo }),
			updatedAt: new Date(),
		},
		include: {
			replies: {
				orderBy: { createdAt: "desc" },
			},
		},
	})

	// TODO: Send notification to customer about status update

	return ticket
}

export async function addTicketReply(ticketId: string, reply: string, isAdmin: boolean = false) {
	const ticketReply = await prisma.ticketReply.create({
		data: {
			ticketId,
			reply,
			isAdmin,
		},
	})

	// TODO: Send email notification to customer about new reply

	return ticketReply
}

export async function getTicketStats() {
	const [total, open, inProgress, waiting, resolved, closed] = await Promise.all([
		prisma.supportTicket.count(),
		prisma.supportTicket.count({ where: { status: "open" } }),
		prisma.supportTicket.count({ where: { status: "in_progress" } }),
		prisma.supportTicket.count({ where: { status: "waiting_customer" } }),
		prisma.supportTicket.count({ where: { status: "resolved" } }),
		prisma.supportTicket.count({ where: { status: "closed" } }),
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
