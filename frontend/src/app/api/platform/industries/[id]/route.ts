import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { industryPatchSchema } from "backend/validators/industryValidator"

async function platformAccess() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	return { session }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id } = await context.params
	const parsed = industryPatchSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid industry details", issues: parsed.error.flatten() }, { status: 400 })
	const data = parsed.data
	try {
		const industry = await prisma.industry.update({
			where: { id },
			data: {
				...(data.name !== undefined ? { name: data.name } : {}),
				...(data.slug !== undefined ? { slug: data.slug } : {}),
				...(data.description !== undefined ? { description: data.description } : {}),
				...(data.icon !== undefined ? { icon: data.icon } : {}),
				...(data.active !== undefined ? { active: data.active } : {}),
				...(data.homepagePreset !== undefined ? { homepagePreset: data.homepagePreset as Prisma.InputJsonObject } : {}),
				...(data.defaultThemeId !== undefined ? { defaultThemeId: data.defaultThemeId } : {}),
			},
		})
		return NextResponse.json({ industry })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return NextResponse.json({ message: "Industry not found" }, { status: 404 })
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "That industry slug is already in use" }, { status: 409 })
		console.error("Industry update failed", error)
		return NextResponse.json({ message: "Unable to update industry" }, { status: 503 })
	}
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id } = await context.params
	const usage = await prisma.industry.findUnique({ where: { id }, select: { _count: { select: { stores: true } }, attributeDefinitions: { select: { _count: { select: { values: true } } } } } })
	if (!usage) return NextResponse.json({ message: "Industry not found" }, { status: 404 })
	const valueCount = usage.attributeDefinitions.reduce((total, definition) => total + definition._count.values, 0)
	if (usage._count.stores > 0 || valueCount > 0) return NextResponse.json({ message: "Industry is in use; disable it instead of deleting it" }, { status: 409 })
	await prisma.industry.delete({ where: { id } })
	return NextResponse.json({ deleted: true })
}
