import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { themeCreateSchema } from "backend/validators/industryValidator"

async function platformAccess() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	return { session }
}

export async function GET() {
	const access = await platformAccess()
	if ("response" in access) return access.response
	try {
		const themes = await prisma.theme.findMany({ include: { industry: { select: { id: true, name: true, slug: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] })
		return NextResponse.json({ themes })
	} catch (error: unknown) {
		console.error("Theme list failed", error)
		return NextResponse.json({ message: "Unable to load theme settings" }, { status: 503 })
	}
}

export async function POST(request: Request) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const parsed = themeCreateSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid theme details", issues: parsed.error.flatten() }, { status: 400 })
	const data = parsed.data
	try {
		const theme = await prisma.theme.create({ data: { ...data, colors: data.colors as Prisma.InputJsonObject, typography: data.typography as Prisma.InputJsonObject } })
		return NextResponse.json({ theme }, { status: 201 })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "That theme slug is already in use" }, { status: 409 })
		console.error("Theme creation failed", error)
		return NextResponse.json({ message: "Unable to create theme" }, { status: 503 })
	}
}
