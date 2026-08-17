import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"

async function userId() {
	const session = await getServerSession()
	return session?.user?.id || null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const id = await userId()
	if (!id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	const { id: addressId } = await params
	const body = await request.json().catch(() => ({}))
	if (body.isDefault !== true) return NextResponse.json({ message: "Only default status can be changed here." }, { status: 400 })

	try {
		const address = await prisma.$transaction(async (transaction) => {
			await transaction.address.updateMany({ where: { userId: id }, data: { isDefault: false } })
			const existing = await transaction.address.findFirst({ where: { id: addressId, userId: id } })
			if (!existing) throw new Error("Address not found")
			return transaction.address.update({ where: { id: existing.id }, data: { isDefault: true } })
		})
		return NextResponse.json({ address })
	} catch {
		return NextResponse.json({ message: "Address not found." }, { status: 404 })
	}
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const id = await userId()
	if (!id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	const { id: addressId } = await params

	try {
		const existing = await prisma.address.findFirst({ where: { id: addressId, userId: id } })
		if (!existing) return NextResponse.json({ message: "Address not found." }, { status: 404 })
		await prisma.address.delete({ where: { id: existing.id } })
		return NextResponse.json({ ok: true })
	} catch {
		return NextResponse.json({ message: "Address not found." }, { status: 404 })
	}
}
