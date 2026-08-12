import { NextRequest } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { submitContact } from "backend/controllers/supportController"

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "contact")
	if (rateLimitResponse) return rateLimitResponse

	return submitContact(req)
}
