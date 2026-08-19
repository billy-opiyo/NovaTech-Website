import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"

async function userId() {
	const session = await getServerSession()
	return session?.user?.id || null
}

export async function GET(request: NextRequest) {
	const id = await userId()
	if (!id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

	const context = await resolveTenantFromRequest(request)
	const notifications = await prisma.notification.findMany({
		where: { userId: id, tenantId: context.tenantId },
		orderBy: { createdAt: "desc" },
		take: 50,
	})
	return NextResponse.json({ notifications })
}

export async function PATCH(request: NextRequest) {
	const id = await userId()
	if (!id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	const context = await resolveTenantFromRequest(request)
	const body = await request.json().catch(() => ({}))
	const where = body.id ? { userId: id, tenantId: context.tenantId, id: String(body.id) } : { userId: id, tenantId: context.tenantId }
	const result = await prisma.notification.updateMany({ where, data: { read: true } })
	return NextResponse.json({ updated: result.count })
}
