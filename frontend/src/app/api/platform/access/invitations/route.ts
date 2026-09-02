import { NextRequest, NextResponse } from "next/server"
import { PlatformRole } from "@prisma/client"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { createActionRecord } from "backend/actions"
import { apiErrorResponse } from "backend/lib/api-handler"
import { createInvitationToken, hashInvitationToken } from "backend/lib/invitation-token"
import { escapeHtml } from "backend/lib/html"
import { sendEmail } from "backend/lib/email"
import { getPublicAppUrl } from "backend/lib/platform-domain"

const inviteRoles = ["PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_ANALYST"] as const
const inviteSchema = z.object({
	email: z.string().trim().email().transform((value) => value.toLowerCase()),
	role: z.enum(inviteRoles),
})

async function requireSuperAdmin() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (session.user.role !== "SUPERADMIN") return { response: NextResponse.json({ message: "Super administrator access required" }, { status: 403 }) }
	return { session }
}

export async function GET() {
	const access = await requireSuperAdmin()
	if (access.response) return access.response

	try {
		const [admins, invitations] = await Promise.all([
			prisma.user.findMany({
				where: { platformRole: { not: null } },
				select: { id: true, name: true, email: true, role: true, platformRole: true, createdAt: true },
				orderBy: [{ platformRole: "asc" }, { createdAt: "asc" }],
			}),
			prisma.platformInvitation.findMany({
				where: { acceptedAt: null, expiresAt: { gt: new Date() } },
				select: { id: true, email: true, role: true, expiresAt: true, createdAt: true, invitedBy: { select: { name: true, email: true } } },
				orderBy: { createdAt: "desc" },
			}),
		])
		return NextResponse.json({ admins, invitations })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Platform access unavailable")
	}
}

export async function POST(request: NextRequest) {
	const access = await requireSuperAdmin()
	if (access.response) return access.response

	try {
		const parsed = inviteSchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Enter a valid email and platform role.", issues: parsed.error.flatten() }, { status: 400 })

		const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, role: true, platformRole: true } })
		if (existingUser?.platformRole || existingUser?.role === "SUPERADMIN") {
			return NextResponse.json({ message: "This user already has platform access." }, { status: 409 })
		}

		const duplicate = await prisma.platformInvitation.findFirst({
			where: { email: parsed.data.email, acceptedAt: null, expiresAt: { gt: new Date() } },
			select: { id: true },
		})
		if (duplicate) return NextResponse.json({ message: "An active platform invitation already exists for this email." }, { status: 409 })

		const token = createInvitationToken()
		const invitation = await prisma.platformInvitation.create({
			data: {
				email: parsed.data.email,
				role: parsed.data.role as PlatformRole,
				tokenHash: hashInvitationToken(token),
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				invitedById: access.session.user.id,
			},
			select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
		})

		const roleName = invitation.role.replace("PLATFORM_", "").replaceAll("_", " ")
		const safeRole = escapeHtml(roleName)
		const inviteLink = new URL(`/auth/accept-platform-invitation?token=${encodeURIComponent(token)}`, `${getPublicAppUrl()}/`).toString()
		await sendEmail({
			to: invitation.email,
			subject: "You have been invited to Nurava Tech platform access",
			html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>Nurava Tech</h1><p>You have been invited to join the Nurava Tech platform as <strong>${safeRole}</strong>.</p><p>This invitation expires in seven days and can only be accepted by ${escapeHtml(invitation.email)}.</p><p><a href="${escapeHtml(inviteLink)}" style="display:inline-block;background:#0070f3;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Accept platform access</a></p><p>If you were not expecting this invitation, you can ignore this email.</p></div>`,
		}).catch((error) => console.error("Platform invitation email could not be sent:", error))
		await createActionRecord("CREATED_PLATFORM_INVITATION", { adminId: access.session.user.id, email: invitation.email, role: invitation.role }).catch(() => undefined)

		return NextResponse.json({ invitation, delivery: "email-and-manual-link", inviteLink }, { status: 201 })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to create platform invitation")
	}
}
