import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function GET(request: Request) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_CATALOG")
		const store = await prisma.store.findFirst({
			where: { id: context.storeId, tenantId: context.tenantId },
			select: {
				industry: {
					select: {
						id: true, name: true, slug: true,
						attributeDefinitions: { where: { active: true }, orderBy: { displayOrder: "asc" } },
						defaultTheme: true,
					},
				},
			},
		})
		return NextResponse.json({ industry: store?.industry ?? null, definitions: store?.industry?.attributeDefinitions ?? [], theme: store?.industry?.defaultTheme ?? null })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Product attributes unavailable")
	}
}
