import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { hashInvitationToken } from "backend/lib/invitation-token"

export async function POST(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id || !session.user.email) return NextResponse.json({ message: "Sign in with the invited email before accepting." }, { status: 401 })
	const body = await request.json().catch(() => ({}))
	const token = typeof body.token === "string" ? body.token.trim() : ""
	if (token.length < 32) return NextResponse.json({ message: "Invitation link is invalid." }, { status: 400 })

	try {
		const invitation = await prisma.invitation.findFirst({ where: { tokenHash: hashInvitationToken(token), acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, tenantId: true, email: true, role: true } })
		if (!invitation) return NextResponse.json({ message: "This invitation is invalid or expired." }, { status: 404 })
		if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) return NextResponse.json({ message: "Sign in with the email address that received this invitation." }, { status: 403 })

		const existing = await prisma.membership.findFirst({ where: { tenantId: invitation.tenantId, userId: session.user.id }, select: { id: true, active: true } })
		if (existing?.active) return NextResponse.json({ message: "You already belong to this store." }, { status: 409 })
		await prisma.$transaction(async (transaction) => {
			if (existing) await transaction.membership.update({ where: { id: existing.id }, data: { role: invitation.role, active: true, acceptedAt: new Date(), invitedAt: new Date() } })
			else await transaction.membership.create({ data: { tenantId: invitation.tenantId, userId: session.user.id, role: invitation.role, active: true, invitedAt: new Date(), acceptedAt: new Date() } })
			await transaction.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } })
		})
		return NextResponse.json({ ok: true, tenantId: invitation.tenantId, role: invitation.role })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Unable to accept invitation" }, { status: 503 })
	}
}
