import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { blogPostCreateSchema } from "backend/validators/blogValidator"

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

export async function GET() {
	const access = await storeAccess()
	if (access.response) return access.response
	try {
		const posts = await prisma.blogPost.findMany({ where: { tenantId: access.context.tenantId, scopeKey: access.context.tenantId }, orderBy: [{ updatedAt: "desc" }] })
		return NextResponse.json({ posts }, { headers: { "Cache-Control": "no-store" } })
	} catch {
		return NextResponse.json({ message: "Store blog is unavailable" }, { status: 503 })
	}
}

export async function POST(request: Request) {
	const access = await storeAccess()
	if (access.response) return access.response
	const parsed = blogPostCreateSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Check the blog post fields", issues: parsed.error.flatten() }, { status: 400 })
	try {
		const post = await prisma.blogPost.create({ data: { ...parsed.data, tenantId: access.context.tenantId, scopeKey: access.context.tenantId, createdById: access.session.user.id, publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null } })
		return NextResponse.json({ post }, { status: 201 })
	} catch (error) {
		const duplicate = error && typeof error === "object" && "code" in error && error.code === "P2002"
		return NextResponse.json({ message: duplicate ? "That blog URL is already in use in your store" : "Unable to save the blog post" }, { status: duplicate ? 409 : 503 })
	}
}
