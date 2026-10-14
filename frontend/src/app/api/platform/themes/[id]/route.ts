import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { themePatchSchema } from "backend/validators/industryValidator"

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
	const parsed = themePatchSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid theme details", issues: parsed.error.flatten() }, { status: 400 })
	const data = parsed.data
	try {
		const theme = await prisma.theme.update({ where: { id }, data: {
			...(data.name !== undefined ? { name: data.name } : {}),
			...(data.slug !== undefined ? { slug: data.slug } : {}),
			...(data.industryId !== undefined ? { industryId: data.industryId } : {}),
			...(data.colors !== undefined ? { colors: data.colors as Prisma.InputJsonObject } : {}),
			...(data.typography !== undefined ? { typography: data.typography as Prisma.InputJsonObject } : {}),
			...(data.heroLayout !== undefined ? { heroLayout: data.heroLayout } : {}),
			...(data.bannerStyle !== undefined ? { bannerStyle: data.bannerStyle } : {}),
			...(data.productGridStyle !== undefined ? { productGridStyle: data.productGridStyle } : {}),
			...(data.active !== undefined ? { active: data.active } : {}),
		} })
		return NextResponse.json({ theme })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return NextResponse.json({ message: "Theme not found" }, { status: 404 })
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "That theme slug is already in use" }, { status: 409 })
		console.error("Theme update failed", error)
		return NextResponse.json({ message: "Unable to update theme" }, { status: 503 })
	}
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id } = await context.params
	const usedAsDefault = await prisma.industry.count({ where: { defaultThemeId: id } })
	if (usedAsDefault > 0) return NextResponse.json({ message: "Theme is assigned as an industry default; disable it instead" }, { status: 409 })
	try {
		await prisma.theme.delete({ where: { id } })
		return NextResponse.json({ deleted: true })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return NextResponse.json({ message: "Theme not found" }, { status: 404 })
		console.error("Theme deletion failed", error)
		return NextResponse.json({ message: "Unable to delete theme" }, { status: 503 })
	}
}
