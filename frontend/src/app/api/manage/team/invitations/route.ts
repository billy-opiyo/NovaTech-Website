import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"
import { createInvitationToken, hashInvitationToken } from "backend/lib/invitation-token"
import { storeInvitationSchema } from "backend/validators/teamValidator"

async function access(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest(request)
	await requireMembership(session.user.id, context.tenantId, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])
	return { session, context }
}

export async function GET(request: NextRequest) {
	try {
		const { context } = await access(request)
		const invitations = await prisma.invitation.findMany({
			where: { tenantId: context.tenantId, acceptedAt: null },
			select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
			orderBy: { createdAt: "desc" },
		})
		return NextResponse.json({ invitations })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Invitations unavailable" }, { status: error.status || 503 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const { session, context } = await access(request)
		const parsed = storeInvitationSchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Enter a valid email and store role.", issues: parsed.error.flatten() }, { status: 400 })

		const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })
		if (existingUser) {
			const existingMembership = await prisma.membership.findFirst({ where: { tenantId: context.tenantId, userId: existingUser.id, active: true }, select: { id: true } })
			if (existingMembership) return NextResponse.json({ message: "This user already belongs to the store." }, { status: 409 })
		}

		const duplicate = await prisma.invitation.findFirst({ where: { tenantId: context.tenantId, email: parsed.data.email, acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } })
		if (duplicate) return NextResponse.json({ message: "An active invitation already exists for this email." }, { status: 409 })

		const token = createInvitationToken()
		const invitation = await prisma.invitation.create({ data: { tenantId: context.tenantId, email: parsed.data.email, role: parsed.data.role, tokenHash: hashInvitationToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), invitedById: session.user.id }, select: { id: true, email: true, role: true, expiresAt: true } })
		return NextResponse.json({ invitation, delivery: "manual-link", inviteLink: `/auth/accept-invitation?token=${encodeURIComponent(token)}` }, { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Unable to create invitation" }, { status: error.status || 503 })
	}
}
