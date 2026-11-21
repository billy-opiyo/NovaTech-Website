import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { createActionRecord } from "backend/actions"
import { apiErrorResponse } from "backend/lib/api-handler"

const schema = z.object({ userId: z.string().min(1), enabled: z.boolean() })

export async function PATCH(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	if (session.user.role !== "SUPERADMIN") return NextResponse.json({ message: "Super administrator access required" }, { status: 403 })

	try {
		const parsed = schema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Choose a platform operator and access state." }, { status: 400 })
		const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, email: true, role: true, platformRole: true, platformAccessEnabled: true } })
		if (!target || !target.platformRole || target.role === "SUPERADMIN") return NextResponse.json({ message: "This platform operator cannot be changed." }, { status: 404 })
		if (target.platformAccessEnabled === parsed.data.enabled) return NextResponse.json({ ok: true, enabled: target.platformAccessEnabled })

		await prisma.user.update({ where: { id: target.id }, data: { platformAccessEnabled: parsed.data.enabled } })
		await createActionRecord(parsed.data.enabled ? "ENABLED_PLATFORM_ACCESS" : "DISABLED_PLATFORM_ACCESS", { adminId: session.user.id, targetUserId: target.id, email: target.email, role: target.platformRole }).catch(() => undefined)
		return NextResponse.json({ ok: true, enabled: parsed.data.enabled })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to update platform access")
	}
}
