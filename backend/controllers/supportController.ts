import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as supportService from "../services/support.service"
import { contactSchema, updateTicketSchema, ticketReplySchema } from "../validators/supportValidator"
import { z } from "zod"
import { resolveTenantFromRequest } from "../lib/tenant"
import { requireStorePermission } from "../lib/tenant-access"
import { parsePagination } from "../lib/pagination"
import { apiErrorResponse } from "../lib/api-handler"

async function storeSupportAccess(req: NextRequest) {
	const session = await getServerSession()
	if (!session?.user?.id) throw Object.assign(new Error("Unauthorized"), { status: 401 })
	const context = await resolveTenantFromRequest(req)
	const membership = await requireStorePermission(session.user.id, context.tenantId, "MANAGE_SUPPORT")
	return { session, context, membership }
}

export async function getTickets(req: NextRequest) {
	try {
		const { context } = await storeSupportAccess(req)

		const searchParams = req.nextUrl.searchParams
		const status = searchParams.get("status") || "All"
		const priority = searchParams.get("priority") || "All"
		const category = searchParams.get("category") || "All"
		const search = searchParams.get("search") || undefined
		const { page, limit } = parsePagination(searchParams)

		if (searchParams.get("stats") === "true") {
			const stats = await supportService.getTicketStats(context.tenantId)
			return NextResponse.json(stats)
		}

		const result = await supportService.getAllTickets({
			status,
			priority,
			category,
			search,
			page,
			limit,
			tenantId: context.tenantId,
		})

		return NextResponse.json(result)
	} catch (error: unknown) {
		console.error("Support tickets API error:", error)
		return apiErrorResponse(error, "Failed to fetch tickets")
	}
}

export async function getTicketById(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { context } = await storeSupportAccess(req)

		const { id } = await params
		const ticket = await supportService.getTicketById(id, context.tenantId)

		return NextResponse.json(ticket)
	} catch (error: unknown) {
		console.error("Get ticket API error:", error)
		return apiErrorResponse(error, "Failed to fetch ticket")
	}
}

export async function updateTicket(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { context } = await storeSupportAccess(req)

		const { id } = await params
		const body = await req.json()
		const validated = updateTicketSchema.parse(body)

		const ticket = await supportService.updateTicket(id, context.tenantId, {
			status: validated.status,
			priority: validated.priority,
			assignedTo: validated.assignedTo,
		})

		// If a reply was included, add it
		if (validated.reply) {
			await supportService.addTicketReply(id, context.tenantId, validated.reply, true)
		}

		return NextResponse.json(ticket)
	} catch (error: unknown) {
		console.error("Update ticket API error:", error)
		return apiErrorResponse(error, "Failed to update ticket")
	}
}

export async function replyToTicket(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { context } = await storeSupportAccess(req)

		const { id } = await params
		const body = await req.json()
		const validated = ticketReplySchema.parse(body)

		const reply = await supportService.addTicketReply(id, context.tenantId, validated.reply, true)

		return NextResponse.json(reply)
	} catch (error: unknown) {
		console.error("Reply to ticket API error:", error)
		return apiErrorResponse(error, "Failed to add reply")
	}
}

export async function submitContact(req: NextRequest) {
	try {
		const context = await resolveTenantFromRequest(req)
		const body = await req.json()
		const validated = contactSchema.parse(body)
		if (validated.website) {
			return NextResponse.json({ message: "Message sent successfully! We will get back to you within 24 hours." }, { status: 201 })
		}

		const ticket = await supportService.createTicket({
			tenantId: context.tenantId,
			customerName: validated.name,
			customerEmail: validated.email,
			customerPhone: validated.phone || "",
			subject: validated.subject,
			description: `${validated.message}\n\nOrder: ${validated.orderNumber || "N/A"}`,
			category: validated.category || "other",
			priority: "medium",
		})

		return NextResponse.json(
			{
				message:
					"Message sent successfully! We will get back to you within 24 hours.",
				ticketId: ticket.id,
			},
			{ status: 201 },
		)
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return apiErrorResponse(error, "Unable to send your message")
	}
}
