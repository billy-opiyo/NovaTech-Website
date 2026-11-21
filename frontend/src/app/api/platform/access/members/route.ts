import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { createActionRecord } from "backend/actions"
import { apiErrorResponse } from "backend/lib/api-handler"
import { PLATFORM_OPERATIONS } from "backend/lib/platform-access"

const schema = z.object({ userId: z.string().min(1), enabled: z.boolean().optional(), operationGrants: z.array(z.string().refine((operation) => PLATFORM_OPERATIONS.includes(operation as typeof PLATFORM_OPERATIONS[number]))).optional() }).refine((value) => value.enabled !== undefined || value.operationGrants !== undefined)

export async function PATCH(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	if (session.user.role !== "SUPERADMIN") return NextResponse.json({ message: "Super administrator access required" }, { status: 403 })

	try {
		const parsed = schema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Choose a platform operator and access state." }, { status: 400 })
		const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, email: true, role: true, platformRole: true, platformAccessEnabled: true, platformOperationGrants: true } })
		if (!target || !target.platformRole || target.role === "SUPERADMIN") return NextResponse.json({ message: "This platform operator cannot be changed." }, { status: 404 })
		const data: { platformAccessEnabled?: boolean; platformOperationGrants?: string[] } = {}
		if (parsed.data.enabled !== undefined) data.platformAccessEnabled = parsed.data.enabled
		if (parsed.data.operationGrants !== undefined) data.platformOperationGrants = parsed.data.operationGrants
		await prisma.user.update({ where: { id: target.id }, data })
		if (data.platformAccessEnabled !== undefined && target.platformAccessEnabled !== data.platformAccessEnabled) await createActionRecord(data.platformAccessEnabled ? "ENABLED_PLATFORM_ACCESS" : "DISABLED_PLATFORM_ACCESS", { adminId: session.user.id, targetUserId: target.id, email: target.email, role: target.platformRole }).catch(() => undefined)
		return NextResponse.json({ ok: true, enabled: data.platformAccessEnabled ?? target.platformAccessEnabled, operationGrants: data.platformOperationGrants ?? target.platformOperationGrants })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to update platform access")
	}
}
