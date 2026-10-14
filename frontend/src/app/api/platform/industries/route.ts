import { NextResponse } from "next/server"
import { ProductAttributeType, Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { industryCreateSchema } from "backend/validators/industryValidator"

async function platformAccess() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	return { session }
}

export async function GET() {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const industries = await prisma.industry.findMany({
		include: {
			defaultTheme: true,
			themes: { where: { active: true }, orderBy: { name: "asc" } },
			categoryTemplates: { orderBy: { displayOrder: "asc" } },
			attributeDefinitions: { orderBy: { displayOrder: "asc" } },
			_count: { select: { stores: true } },
		},
		orderBy: [{ active: "desc" }, { name: "asc" }],
	})
	return NextResponse.json({ industries })
}

export async function POST(request: Request) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const parsed = industryCreateSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid industry details", issues: parsed.error.flatten() }, { status: 400 })
	const data = parsed.data
	try {
		const industry = await prisma.industry.create({
			data: {
				name: data.name,
				slug: data.slug,
				description: data.description,
				icon: data.icon,
				active: data.active,
				homepagePreset: data.homepagePreset as Prisma.InputJsonObject | undefined,
				defaultThemeId: data.defaultThemeId,
				categoryTemplates: data.categoryTemplates ? { create: data.categoryTemplates } : undefined,
				attributeDefinitions: data.attributeDefinitions ? { create: data.attributeDefinitions.map((attribute) => ({ ...attribute, type: attribute.type as ProductAttributeType })) } : undefined,
				storeTypes: { create: data.storeTypes?.length ? data.storeTypes : [{ name: "Store", slug: "store", description: "General retail store type." }] },
			},
			include: { categoryTemplates: true, attributeDefinitions: true },
		})
		return NextResponse.json({ industry }, { status: 201 })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "That industry slug or attribute key is already in use" }, { status: 409 })
		console.error("Industry creation failed", error)
		return NextResponse.json({ message: "Unable to create industry" }, { status: 503 })
	}
}
