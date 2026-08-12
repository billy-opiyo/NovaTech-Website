import { NextRequest } from "next/server"
import { getTickets } from "backend/controllers/supportController"

export async function GET(req: NextRequest) {
	return getTickets(req)
}