import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { createActionRecord } from "backend/actions"
import { apiErrorResponse } from "backend/lib/api-handler"
import { hashInvitationToken } from "backend/lib/invitation-token"

function tokenFrom(request: NextRequest) {
	return request.nextUrl.searchParams.get("token")?.trim() || ""
}

export async function GET(request: NextRequest) {
	const token = tokenFrom(request)
	if (token.length < 32) return NextResponse.json({ message: "Platform invitation link is invalid." }, { status: 400 })

	try {
		const invitation = await prisma.platformInvitation.findFirst({
			where: { tokenHash: hashInvitationToken(token), acceptedAt: null, expiresAt: { gt: new Date() } },
			select: { email: true, role: true, expiresAt: true },
		})
		if (!invitation) return NextResponse.json({ message: "This platform invitation is invalid or expired." }, { status: 404 })
		return NextResponse.json({ invitation })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Platform invitation unavailable")
	}
}

export async function POST(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id || !session.user.email) return NextResponse.json({ message: "Sign in with the invited email before accepting." }, { status: 401 })

	const body = await request.json().catch(() => ({}))
	const token = typeof body.token === "string" ? body.token.trim() : ""
	if (token.length < 32) return NextResponse.json({ message: "Platform invitation link is invalid." }, { status: 400 })

	try {
		const invitation = await prisma.platformInvitation.findFirst({
			where: { tokenHash: hashInvitationToken(token), acceptedAt: null, expiresAt: { gt: new Date() } },
			select: { id: true, email: true, role: true },
		})
		if (!invitation) return NextResponse.json({ message: "This platform invitation is invalid or expired." }, { status: 404 })
		if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) return NextResponse.json({ message: "Sign in with the email address that received this invitation." }, { status: 403 })

		const existingUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { platformRole: true, role: true } })
		if (existingUser?.platformRole || existingUser?.role === "SUPERADMIN") return NextResponse.json({ message: "This account already has platform access." }, { status: 409 })

		const claimedAt = new Date()
		await prisma.$transaction(async (transaction) => {
			const claimed = await transaction.platformInvitation.updateMany({
				where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: claimedAt } },
				data: { acceptedAt: claimedAt },
			})
			if (claimed.count !== 1) throw Object.assign(new Error("This platform invitation is no longer available."), { status: 409 })
			await transaction.user.update({ where: { id: session.user.id }, data: { platformRole: invitation.role } })
		})

		await createActionRecord("ACCEPTED_PLATFORM_INVITATION", { adminId: session.user.id, email: invitation.email, role: invitation.role }).catch(() => undefined)
		return NextResponse.json({ ok: true, role: invitation.role, redirectTo: "/platform" })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to accept platform invitation")
	}
}
