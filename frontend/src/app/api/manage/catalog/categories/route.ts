import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
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

const categorySchema = z.object({
	name: z.string().trim().min(2).max(80),
	description: z.string().trim().max(320).optional(),
})

function slugify(value: string) {
	return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120)
}

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_CATALOG")
		const parsed = categorySchema.safeParse(await request.json())
		if (!parsed.success) return NextResponse.json({ message: "Enter a category name", issues: parsed.error.flatten() }, { status: 400 })
		const category = await prisma.category.create({
			data: { tenantId: context.tenantId, name: parsed.data.name, slug: slugify(parsed.data.name), description: parsed.data.description || null },
			select: { id: true, name: true, slug: true, description: true },
		})
		return NextResponse.json({ category }, { status: 201 })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to create product category")
	}
}
