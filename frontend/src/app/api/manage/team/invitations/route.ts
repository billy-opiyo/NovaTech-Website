import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { createInvitationToken, hashInvitationToken } from "backend/lib/invitation-token"
import { storeInvitationSchema } from "backend/validators/teamValidator"
import { assertTenantStaffLimit } from "backend/billing/subscription"
import { sendEmail } from "backend/lib/email"

async function access(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
	await requireStorePermission(session.user.id, context.tenantId, "MANAGE_TEAM")
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
		await assertTenantStaffLimit(context.tenantId)

		const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })
		if (existingUser) {
			const existingMembership = await prisma.membership.findFirst({ where: { tenantId: context.tenantId, userId: existingUser.id, active: true }, select: { id: true } })
			if (existingMembership) return NextResponse.json({ message: "This user already belongs to the store." }, { status: 409 })
		}

		const duplicate = await prisma.invitation.findFirst({ where: { tenantId: context.tenantId, email: parsed.data.email, acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } })
		if (duplicate) return NextResponse.json({ message: "An active invitation already exists for this email." }, { status: 409 })

		const token = createInvitationToken()
		const invitation = await prisma.invitation.create({ data: { tenantId: context.tenantId, email: parsed.data.email, role: parsed.data.role, tokenHash: hashInvitationToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), invitedById: session.user.id }, select: { id: true, email: true, role: true, expiresAt: true } })
		const inviteLink = new URL(`/auth/accept-invitation?token=${encodeURIComponent(token)}`, request.url).toString()
		const store = await prisma.store.findUnique({ where: { id: context.storeId }, select: { name: true } })
		await sendEmail({
			to: invitation.email,
			subject: `You have been invited to manage ${store?.name || "a Nurava Tech store"}`,
			html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>Nurava Tech</h1><p>You have been invited to join <strong>${store?.name || "a merchant store"}</strong> as <strong>${invitation.role.replace("STORE_", "").replaceAll("_", " ")}</strong>.</p><p>This invitation expires in seven days and can only be accepted by ${invitation.email}.</p><p><a href="${inviteLink}" style="display:inline-block;background:#0070f3;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Accept invitation</a></p><p>If you were not expecting this invitation, you can ignore this email.</p></div>`,
		}).catch((error) => console.error("Invitation email could not be sent:", error))
		return NextResponse.json({ invitation, delivery: "email-and-manual-link", inviteLink }, { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Unable to create invitation" }, { status: error.status || 503 })
	}
}
