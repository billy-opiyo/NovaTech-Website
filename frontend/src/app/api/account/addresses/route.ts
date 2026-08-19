import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"

const addressSchema = z.object({
	label: z.string().trim().max(40).optional(),
	county: z.string().trim().min(2).max(80),
	town: z.string().trim().min(2).max(80),
	landmark: z.string().trim().max(120).optional(),
	phone: z.string().trim().min(7).max(20),
	isDefault: z.boolean().optional().default(false),
})

async function userId() {
	const session = await getServerSession()
	return session?.user?.id || null
}

export async function GET(request: NextRequest) {
	const id = await userId()
	if (!id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

	const context = await resolveTenantFromRequest(request)
	const addresses = await prisma.address.findMany({
		where: { userId: id, tenantId: context.tenantId },
		orderBy: [{ isDefault: "desc" }, { id: "desc" }],
	})
	return NextResponse.json({ addresses })
}

export async function POST(request: NextRequest) {
	const id = await userId()
	if (!id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	const context = await resolveTenantFromRequest(request)

	try {
		const input = addressSchema.parse(await request.json())
		const address = await prisma.$transaction(async (transaction) => {
			if (input.isDefault) await transaction.address.updateMany({ where: { userId: id, tenantId: context.tenantId }, data: { isDefault: false } })
			return transaction.address.create({ data: { ...input, userId: id, tenantId: context.tenantId } })
		})
		return NextResponse.json({ address }, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) return NextResponse.json({ message: "Please check the address details.", errors: error.errors }, { status: 400 })
		return NextResponse.json({ message: "Unable to save this address." }, { status: 500 })
	}
}
