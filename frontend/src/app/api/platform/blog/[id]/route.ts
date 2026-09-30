import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { blogPostUpdateSchema } from "backend/validators/blogValidator"

async function platformAdmin() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (session.user.role !== "SUPERADMIN" && !["PLATFORM_OWNER", "PLATFORM_ADMIN"].includes(session.user.platformRole || "")) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	return { session }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const access = await platformAdmin()
	if (access.response) return access.response
	const parsed = blogPostUpdateSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return NextResponse.json({ message: "Check the blog post fields", issues: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 })
	try {
		const data = parsed.data
		const id = (await params).id
		const existing = await prisma.blogPost.findFirst({ where: { id, tenantId: null, scopeKey: "platform" }, select: { status: true, publishedAt: true } })
		if (!existing) return NextResponse.json({ message: "Blog post not found" }, { status: 404 })
		const publishedAt = data.status === "PUBLISHED" ? existing.status === "PUBLISHED" ? existing.publishedAt : new Date() : data.status ? null : undefined
		const updated = await prisma.blogPost.updateMany({ where: { id, tenantId: null, scopeKey: "platform" }, data: { ...data, ...(data.status ? { publishedAt } : {}) } })
		if (!updated.count) return NextResponse.json({ message: "Blog post not found" }, { status: 404 })
		const post = await prisma.blogPost.findFirst({ where: { id, tenantId: null, scopeKey: "platform" } })
		return NextResponse.json({ post })
	} catch (error) {
		const duplicate = error && typeof error === "object" && "code" in error && error.code === "P2002"
		return NextResponse.json({ message: duplicate ? "That platform blog URL is already in use" : "Unable to update the blog post" }, { status: duplicate ? 409 : 503 })
	}
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const access = await platformAdmin()
	if (access.response) return access.response
	try {
		const result = await prisma.blogPost.deleteMany({ where: { id: (await params).id, tenantId: null, scopeKey: "platform" } })
		return result.count ? NextResponse.json({ ok: true }) : NextResponse.json({ message: "Blog post not found" }, { status: 404 })
	} catch {
		return NextResponse.json({ message: "Unable to delete the blog post" }, { status: 503 })
	}
}
