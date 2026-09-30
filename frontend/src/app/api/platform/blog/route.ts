import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { blogPostCreateSchema } from "backend/validators/blogValidator"

async function platformAdmin() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (session.user.role !== "SUPERADMIN" && !["PLATFORM_OWNER", "PLATFORM_ADMIN"].includes(session.user.platformRole || "")) {
		return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	}
	return { session }
}

export async function GET() {
	const access = await platformAdmin()
	if (access.response) return access.response
	try {
		const posts = await prisma.blogPost.findMany({ where: { scopeKey: "platform", tenantId: null }, orderBy: [{ updatedAt: "desc" }] })
		return NextResponse.json({ posts }, { headers: { "Cache-Control": "no-store" } })
	} catch {
		return NextResponse.json({ message: "Platform blog is unavailable" }, { status: 503 })
	}
}

export async function POST(request: Request) {
	const access = await platformAdmin()
	if (access.response) return access.response
	const parsed = blogPostCreateSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Check the blog post fields", issues: parsed.error.flatten() }, { status: 400 })
	try {
		const post = await prisma.blogPost.create({ data: { ...parsed.data, tenantId: null, scopeKey: "platform", createdById: access.session.user.id, publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null } })
		return NextResponse.json({ post }, { status: 201 })
	} catch (error) {
		const duplicate = error && typeof error === "object" && "code" in error && error.code === "P2002"
		return NextResponse.json({ message: duplicate ? "That platform blog URL is already in use" : "Unable to save the blog post" }, { status: duplicate ? 409 : 503 })
	}
}
