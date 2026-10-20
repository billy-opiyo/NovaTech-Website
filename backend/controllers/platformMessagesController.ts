import { SupportTicketSource, TicketStatus } from "@prisma/client"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasPlatformSupportAccess } from "../lib/platform-access"
import { apiErrorResponse } from "../lib/api-handler"
import prisma from "../lib/db"
import { parsePagination } from "../lib/pagination"
import * as supportService from "../services/support.service"
import { ticketReplySchema } from "../validators/supportValidator"

const messageStatusSchema = z.object({
	status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]),
})

const statusValues = new Set(Object.values(TicketStatus))

async function requirePlatformSupportApi() {
	const session = await auth()
	if (!session?.user?.id) {
		return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	}
	if (!hasPlatformSupportAccess(session)) {
		return { response: NextResponse.json({ message: "Platform support access required" }, { status: 403 }) }
	}
	return { session }
}

export async function getPlatformMessages(request: NextRequest) {
	const access = await requirePlatformSupportApi()
	if (access.response) return access.response

	const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 160) || ""
	const requestedStatus = request.nextUrl.searchParams.get("status")?.toUpperCase() || "ALL"
	const { page, limit, skip } = parsePagination(request.nextUrl.searchParams)
	const where = {
		source: SupportTicketSource.PLATFORM_CONTACT,
		tenantId: null,
		...(statusValues.has(requestedStatus as TicketStatus) ? { status: requestedStatus as TicketStatus } : {}),
		...(search ? {
			OR: [
				{ subject: { contains: search, mode: "insensitive" as const } },
				{ customerName: { contains: search, mode: "insensitive" as const } },
				{ customerEmail: { contains: search, mode: "insensitive" as const } },
				{ description: { contains: search, mode: "insensitive" as const } },
			],
		} : {}),
	}

	try {
		const [messages, total] = await Promise.all([
			prisma.supportTicket.findMany({
				where,
				orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
				skip,
				take: limit,
				select: { id: true, customerName: true, customerEmail: true, customerPhone: true, subject: true, description: true, category: true, priority: true, status: true, createdAt: true, updatedAt: true },
			}),
			prisma.supportTicket.count({ where }),
		])
		return NextResponse.json({ messages, total, page, limit, totalPages: Math.ceil(total / limit) })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to load platform messages")
	}
}

export async function getPlatformMessage(messageId: string) {
	const access = await requirePlatformSupportApi()
	if (access.response) return access.response
	try {
		const message = await prisma.supportTicket.findFirst({
			where: { id: messageId, source: SupportTicketSource.PLATFORM_CONTACT, tenantId: null },
			include: { replies: { orderBy: { createdAt: "asc" } } },
		})
		if (!message) return NextResponse.json({ message: "Platform message not found" }, { status: 404 })
		return NextResponse.json(message)
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to load platform message")
	}
}

export async function replyToPlatformMessage(messageId: string, request: NextRequest) {
	const access = await requirePlatformSupportApi()
	if (access.response) return access.response
	try {
		const input = ticketReplySchema.parse(await request.json())
		const message = await prisma.supportTicket.findFirst({
			where: { id: messageId, source: SupportTicketSource.PLATFORM_CONTACT, tenantId: null },
			select: { id: true },
		})
		if (!message) return NextResponse.json({ message: "Platform message not found" }, { status: 404 })
		const reply = await supportService.addTicketReply(message.id, null, input.reply, true, SupportTicketSource.PLATFORM_CONTACT)
		return NextResponse.json(reply, { status: 201 })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to reply to platform message")
	}
}

export async function updatePlatformMessage(messageId: string, request: NextRequest) {
	const access = await requirePlatformSupportApi()
	if (access.response) return access.response
	try {
		const input = messageStatusSchema.parse(await request.json())
		const message = await prisma.supportTicket.findFirst({
			where: { id: messageId, source: SupportTicketSource.PLATFORM_CONTACT, tenantId: null },
			select: { id: true },
		})
		if (!message) return NextResponse.json({ message: "Platform message not found" }, { status: 404 })
		const status = input.status as "open" | "in_progress" | "waiting_customer" | "resolved" | "closed"
		const updated = await supportService.updateTicket(message.id, null, { status }, SupportTicketSource.PLATFORM_CONTACT)
		return NextResponse.json(updated)
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to update platform message")
	}
}
