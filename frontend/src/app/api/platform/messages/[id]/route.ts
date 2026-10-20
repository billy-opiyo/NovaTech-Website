import { NextRequest } from "next/server"
import { getPlatformMessage, replyToPlatformMessage, updatePlatformMessage } from "backend/controllers/platformMessagesController"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
	const { id } = await params
	return getPlatformMessage(id)
}

export async function POST(request: NextRequest, { params }: RouteContext) {
	const { id } = await params
	return replyToPlatformMessage(id, request)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
	const { id } = await params
	return updatePlatformMessage(id, request)
}
