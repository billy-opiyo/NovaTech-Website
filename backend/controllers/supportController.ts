import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as supportService from "../services/support.service"
import { contactSchema, updateTicketSchema, ticketReplySchema } from "../validators/supportValidator"
import { sendEmail } from "../lib/email"
import { z } from "zod"
import { resolveTenantFromRequest } from "../lib/tenant"
import { requireStorePermission } from "../lib/tenant-access"
import { PLATFORM_SUPPORT_EMAIL } from "../lib/brand"

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
		const page = parseInt(searchParams.get("page") || "1", 10)
		const limit = parseInt(searchParams.get("limit") || "20", 10)

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
	} catch (error: any) {
		console.error("Support tickets API error:", error)
		return NextResponse.json(
			{ message: "Failed to fetch tickets", error: error.message },
			{ status: error?.status || 500 },
		)
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
	} catch (error: any) {
		console.error("Get ticket API error:", error)
		return NextResponse.json(
			{ message: error.message || "Failed to fetch ticket", error: error.message },
			{ status: error?.status || (error.message === "Ticket not found" ? 404 : 500) },
		)
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
	} catch (error: any) {
		console.error("Update ticket API error:", error)
		return NextResponse.json(
			{ message: error.message || "Failed to update ticket", error: error.message },
			{ status: error?.status || (error.message === "Ticket not found" ? 404 : 500) },
		)
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
	} catch (error: any) {
		console.error("Reply to ticket API error:", error)
		return NextResponse.json(
			{ message: error.message || "Failed to add reply", error: error.message },
			{ status: error?.status || (error.message === "Ticket not found" ? 404 : 500) },
		)
	}
}

export async function submitContact(req: NextRequest) {
	try {
		const context = await resolveTenantFromRequest(req)
		const body = await req.json()
		const validated = contactSchema.parse(body)

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

		await sendEmail({
			to: PLATFORM_SUPPORT_EMAIL,
			subject: `New Support Ticket: ${validated.subject}`,
			html: `
				<h2>New Support Request</h2>
				<p><strong>Name:</strong> ${validated.name}</p>
				<p><strong>Email:</strong> ${validated.email}</p>
				<p><strong>Phone:</strong> ${validated.phone || "N/A"}</p>
				<p><strong>Order:</strong> ${validated.orderNumber || "N/A"}</p>
				<p><strong>Subject:</strong> ${validated.subject}</p>
				<p><strong>Message:</strong> ${validated.message}</p>
			`,
		})

		return NextResponse.json(
			{
				message:
					"Message sent successfully! We will get back to you within 24 hours.",
				ticketId: ticket.id,
			},
			{ status: 201 },
		)
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: error?.status || 500 })
	}
}
