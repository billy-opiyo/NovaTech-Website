import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"

async function userId() {
	const session = await getServerSession()
	return session?.user?.id || null
}

export async function GET() {
	const id = await userId()
	if (!id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

	const notifications = await prisma.notification.findMany({
		where: { userId: id },
		orderBy: { createdAt: "desc" },
		take: 50,
	})
	return NextResponse.json({ notifications })
}

export async function PATCH(request: NextRequest) {
	const id = await userId()
	if (!id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	const body = await request.json().catch(() => ({}))
	const where = body.id ? { userId: id, id: String(body.id) } : { userId: id }
	const result = await prisma.notification.updateMany({ where, data: { read: true } })
	return NextResponse.json({ updated: result.count })
}
