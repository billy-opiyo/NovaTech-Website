import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_CATALOG")
		const categories = await prisma.category.findMany({ where: { tenantId: context.tenantId }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } })
		return NextResponse.json({ categories })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Product categories unavailable")
	}
}
