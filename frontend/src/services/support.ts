import { apiFetch, buildQueryString } from "./api"

export interface SupportTicket {
	id: string
	customerName: string
	customerEmail: string
	customerPhone?: string | null
	subject: string
	description: string
	category: string
	priority: string
	status: string
	orderId?: string | null
	attachments: string[]
	createdAt: string
	updatedAt: string
	replies?: {
		id: string
		reply: string
		isAdmin: boolean
		createdAt: string
	}[]
}

export interface TicketListResponse {
	tickets: SupportTicket[]
	total: number
	page: number
	totalPages: number
}

export interface TicketStats {
	total: number
	open: number
	inProgress: number
	waiting: number
	resolved: number
	closed: number
}

export interface ContactInput {
	name: string
	email: string
	phone?: string
	subject: string
	message: string
	orderNumber?: string
	category?: string
}

export async function getTickets(query: {
	status?: string
	priority?: string
	category?: string
	search?: string
	page?: number
	limit?: number
} = {}): Promise<TicketListResponse> {
	const qs = buildQueryString(query)
	return apiFetch<TicketListResponse>(`/api/support/tickets${qs}`)
}

export async function getTicketStats(): Promise<TicketStats> {
	return apiFetch<TicketStats>("/api/support/tickets?stats=true")
}

export async function getTicketById(id: string): Promise<SupportTicket> {
	return apiFetch<SupportTicket>(`/api/support/tickets/${id}`)
}

export async function updateTicket(
	id: string,
	data: {
		status?: string
		priority?: string
		assignedTo?: string
		reply?: string
	},
): Promise<SupportTicket> {
	return apiFetch<SupportTicket>(`/api/support/tickets/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	})
}

export async function replyToTicket(id: string, reply: string) {
	return apiFetch<{ id: string; reply: string; isAdmin: boolean; createdAt: string }>(
		`/api/support/tickets/${id}`,
		{
			method: "POST",
			body: JSON.stringify({ reply }),
		},
	)
}

export async function submitContact(data: ContactInput) {
	return apiFetch<{ message: string; ticketId: string }>("/api/contact", {
		method: "POST",
		body: JSON.stringify(data),
	})
}