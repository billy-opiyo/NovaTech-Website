import { NextResponse } from "next/server"
import { Prisma, ProductAttributeType } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { attributeDefinitionPatchSchema } from "backend/validators/industryValidator"

async function platformAccess() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	return { session }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; attributeId: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id, attributeId } = await context.params
	const parsed = attributeDefinitionPatchSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid attribute definition", issues: parsed.error.flatten() }, { status: 400 })
	const data = parsed.data
	try {
		const existing = await prisma.productAttributeDefinition.findFirst({ where: { id: attributeId, industryId: id }, select: { id: true } })
		if (!existing) return NextResponse.json({ message: "Attribute definition not found" }, { status: 404 })
		const definition = await prisma.productAttributeDefinition.update({ where: { id: existing.id }, data: {
			...(data.name !== undefined ? { name: data.name } : {}),
			...(data.key !== undefined ? { key: data.key } : {}),
			...(data.type !== undefined ? { type: data.type as ProductAttributeType } : {}),
			...(data.required !== undefined ? { required: data.required } : {}),
			...(data.options !== undefined ? { options: data.options } : {}),
			...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
			...(data.active !== undefined ? { active: data.active } : {}),
		} })
		return NextResponse.json({ definition })
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return NextResponse.json({ message: "Attribute definition not found" }, { status: 404 })
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ message: "That attribute key already exists for this industry" }, { status: 409 })
		console.error("Attribute definition update failed", error)
		return NextResponse.json({ message: "Unable to update attribute definition" }, { status: 503 })
	}
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; attributeId: string }> }) {
	const access = await platformAccess()
	if ("response" in access) return access.response
	const { id, attributeId } = await context.params
	const definition = await prisma.productAttributeDefinition.findFirst({ where: { id: attributeId, industryId: id }, select: { id: true, _count: { select: { values: true } } } })
	if (!definition) return NextResponse.json({ message: "Attribute definition not found" }, { status: 404 })
	if (definition._count.values > 0) return NextResponse.json({ message: "Attribute definition is in use; disable it instead" }, { status: 409 })
	await prisma.productAttributeDefinition.delete({ where: { id: attributeId } })
	return NextResponse.json({ deleted: true })
}
