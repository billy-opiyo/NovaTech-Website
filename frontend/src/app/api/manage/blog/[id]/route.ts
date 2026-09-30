import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { blogPostUpdateSchema } from "backend/validators/blogValidator"

async function storeAccess() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	try {
		const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_STORE_SETTINGS")
		return { session, context }
	} catch (error) {
		const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 404
		return { response: NextResponse.json({ message: status === 403 ? "You cannot manage this store's blog" : "Store workspace unavailable" }, { status }) }
	}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const access = await storeAccess()
	if (access.response) return access.response
	const parsed = blogPostUpdateSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return NextResponse.json({ message: "Check the blog post fields", issues: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 })
	try {
		const { id } = await params
		const data = parsed.data
		const existing = await prisma.blogPost.findFirst({ where: { id, tenantId: access.context.tenantId, scopeKey: access.context.tenantId }, select: { status: true, publishedAt: true } })
		if (!existing) return NextResponse.json({ message: "Blog post not found" }, { status: 404 })
		const publishedAt = data.status === "PUBLISHED" ? existing.status === "PUBLISHED" ? existing.publishedAt : new Date() : data.status ? null : undefined
		const updated = await prisma.blogPost.updateMany({ where: { id, tenantId: access.context.tenantId, scopeKey: access.context.tenantId }, data: { ...data, ...(data.status ? { publishedAt } : {}) } })
		if (!updated.count) return NextResponse.json({ message: "Blog post not found" }, { status: 404 })
		const post = await prisma.blogPost.findFirst({ where: { id, tenantId: access.context.tenantId, scopeKey: access.context.tenantId } })
		return NextResponse.json({ post })
	} catch (error) {
		const duplicate = error && typeof error === "object" && "code" in error && error.code === "P2002"
		return NextResponse.json({ message: duplicate ? "That blog URL is already in use in your store" : "Unable to update the blog post" }, { status: duplicate ? 409 : 503 })
	}
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const access = await storeAccess()
	if (access.response) return access.response
	try {
		const result = await prisma.blogPost.deleteMany({ where: { id: (await params).id, tenantId: access.context.tenantId, scopeKey: access.context.tenantId } })
		return result.count ? NextResponse.json({ ok: true }) : NextResponse.json({ message: "Blog post not found" }, { status: 404 })
	} catch {
		return NextResponse.json({ message: "Unable to delete the blog post" }, { status: 503 })
	}
}
