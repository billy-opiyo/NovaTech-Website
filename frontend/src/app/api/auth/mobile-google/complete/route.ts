import { randomBytes, createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import prisma from "backend/lib/db"
import { auth } from "@/lib/auth"

const MOBILE_TICKET_PREFIX = "mobile-google:"
const TICKET_TTL_MS = 2 * 60 * 1000

export async function GET(request: NextRequest) {
	const state = request.nextUrl.searchParams.get("state") || ""
	if (!/^[0-9a-f-]{36}$/i.test(state)) {
		return NextResponse.redirect(new URL("/auth/error?error=MobileAuthState", request.url))
	}

	const session = await auth()
	const userId = session?.user?.id
	if (!userId) return NextResponse.redirect(new URL("/auth/error?error=OAuthCallbackError", request.url))

	const ticket = randomBytes(32).toString("base64url")
	const token = createHash("sha256").update(ticket).digest("hex")
	const now = new Date()
	await prisma.verificationToken.deleteMany({
		where: { identifier: { startsWith: MOBILE_TICKET_PREFIX }, expires: { lt: now } },
	})
	await prisma.verificationToken.create({
		data: {
			identifier: `${MOBILE_TICKET_PREFIX}${userId}`,
			token,
			expires: new Date(now.getTime() + TICKET_TTL_MS),
		},
	})

	const appUrl = new URL("com.nurava.hubstores://auth/callback")
	appUrl.searchParams.set("ticket", ticket)
	appUrl.searchParams.set("state", state)
	return new Response(null, {
		status: 302,
		headers: { Location: appUrl.toString(), "Cache-Control": "no-store" },
	})
}
