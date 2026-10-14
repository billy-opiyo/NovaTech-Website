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

export async function PATCH(request: Request, context: { params: Promise<{ id: string; categoryId: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id, categoryId } = await context.params
	const parsed = categoryTemplateSchema.partial().safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid category preset", issues: parsed.error.flatten() }, { status: 400 })
	const existing = await prisma.industryCategoryTemplate.findFirst({ where: { id: categoryId, industryId: id }, select: { id: true } })
	if (!existing) return NextResponse.json({ message: "Category preset not found" }, { status: 404 })
	try {
		const category = await prisma.industryCategoryTemplate.update({ where: { id: existing.id }, data: parsed.data })
		return NextResponse.json({ category })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "That category slug already exists in this industry" }, { status: 409 })
		console.error("Industry category update failed", error)
		return NextResponse.json({ message: "Unable to update category preset" }, { status: 503 })
	}
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; categoryId: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id, categoryId } = await context.params
	const category = await prisma.industryCategoryTemplate.findFirst({ where: { id: categoryId, industryId: id }, select: { id: true } })
	if (!category) return NextResponse.json({ message: "Category preset not found" }, { status: 404 })
	await prisma.industryCategoryTemplate.delete({ where: { id: category.id } })
	return NextResponse.json({ deleted: true })
}
