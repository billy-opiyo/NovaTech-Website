import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getTicketById, updateTicket, addTicketReply } from "backend/services/support.service"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
			return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
		}

		const { id } = await params
		const ticket = await getTicketById(id)

		return NextResponse.json(ticket)
	} catch (error: any) {
		console.error("Get ticket API error:", error)
		return NextResponse.json(
			{ message: error.message || "Failed to fetch ticket", error: error.message },
			{ status: error.message === "Ticket not found" ? 404 : 500 },
		)
	}
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
			return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
		}

		const { id } = await params
		const body = await req.json()

		const ticket = await updateTicket(id, {
			status: body.status,
			priority: body.priority,
			assignedTo: body.assignedTo,
		})

		// If a reply was included, add it
		if (body.reply) {
			await addTicketReply(id, body.reply, true)
		}

		return NextResponse.json(ticket)
	} catch (error: any) {
		console.error("Update ticket API error:", error)
		return NextResponse.json(
			{ message: error.message || "Failed to update ticket", error: error.message },
			{ status: error.message === "Ticket not found" ? 404 : 500 },
		)
	}
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
			return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
		}

		const { id } = await params
		const body = await req.json()

		const reply = await addTicketReply(id, body.reply, true)

		return NextResponse.json(reply)
	} catch (error: any) {
		console.error("Reply to ticket API error:", error)
		return NextResponse.json(
			{ message: error.message || "Failed to add reply", error: error.message },
			{ status: error.message === "Ticket not found" ? 404 : 500 },
		)
	}
}
</arg_value></tool_call>