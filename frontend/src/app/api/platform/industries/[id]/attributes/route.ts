import { NextResponse } from "next/server"
import { Prisma, ProductAttributeType } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { attributeDefinitionCreateSchema } from "backend/validators/industryValidator"

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
	const definitions = await prisma.productAttributeDefinition.findMany({ where: { industryId: id }, orderBy: { displayOrder: "asc" } })
	return NextResponse.json({ definitions })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id } = await context.params
	const parsed = attributeDefinitionCreateSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid attribute definition", issues: parsed.error.flatten() }, { status: 400 })
	try {
		const definition = await prisma.productAttributeDefinition.create({ data: { industryId: id, ...parsed.data, type: parsed.data.type as ProductAttributeType } })
		return NextResponse.json({ definition }, { status: 201 })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "That attribute key already exists for this industry" }, { status: 409 })
		console.error("Attribute definition creation failed", error)
		return NextResponse.json({ message: "Unable to create attribute definition" }, { status: 503 })
	}
}
