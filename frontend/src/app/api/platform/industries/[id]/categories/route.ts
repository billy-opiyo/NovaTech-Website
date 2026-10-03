import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { categoryTemplateSchema } from "backend/validators/industryValidator"

async function platformAccess() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	return { session }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id } = await context.params
	const categories = await prisma.industryCategoryTemplate.findMany({ where: { industryId: id }, orderBy: { displayOrder: "asc" } })
	return NextResponse.json({ categories })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id } = await context.params
	const parsed = categoryTemplateSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid category preset", issues: parsed.error.flatten() }, { status: 400 })
	try {
		const category = await prisma.industryCategoryTemplate.create({ data: { industryId: id, ...parsed.data } })
		return NextResponse.json({ category }, { status: 201 })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "That category slug already exists in this industry" }, { status: 409 })
		console.error("Industry category creation failed", error)
		return NextResponse.json({ message: "Unable to create category preset" }, { status: 503 })
	}
}
