import { NextRequest } from "next/server"
import { getPlatformMessages } from "backend/controllers/platformMessagesController"

export async function GET(request: NextRequest) {
	return getPlatformMessages(request)
}
