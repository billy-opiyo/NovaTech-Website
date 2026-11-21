import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"
import { apiErrorResponse } from "backend/lib/api-handler"

const schema = z.object({ membershipId: z.string().min(1), enabled: z.boolean() })

export async function PATCH(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

	try {
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		const actor = await requireMembership(session.user.id, context.tenantId)
		if (actor.role !== MembershipRole.STORE_OWNER) return NextResponse.json({ message: "Only the store owner can change team access." }, { status: 403 })
		const parsed = schema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Choose a team member and access state." }, { status: 400 })

		const target = await prisma.membership.findFirst({
			where: { id: parsed.data.membershipId, tenantId: context.tenantId },
			select: { id: true, role: true, active: true },
		})
		if (!target || target.role === MembershipRole.STORE_OWNER) return NextResponse.json({ message: "This membership cannot be changed." }, { status: 404 })
		if (target.active === parsed.data.enabled) return NextResponse.json({ ok: true, enabled: target.active })

		await prisma.membership.update({ where: { id: target.id }, data: { active: parsed.data.enabled } })
		return NextResponse.json({ ok: true, enabled: parsed.data.enabled })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to update store access")
	}
}
