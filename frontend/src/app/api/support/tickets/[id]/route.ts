import { NextRequest } from "next/server"
import { getTicketById, updateTicket, replyToTicket } from "backend/controllers/supportController"

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return getTicketById(req, { params })
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return updateTicket(req, { params })
}

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	return replyToTicket(req, { params })
}