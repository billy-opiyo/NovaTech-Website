import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"

export async function requireAuth(req: NextRequest) {
	const session = await getServerSession()
	if (!session?.user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
	}
	return session
}

export async function requireAdmin(req: NextRequest) {
	const session = await getServerSession()
	if (
		!session?.user ||
		(session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
	) {
		return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	}
	return session
}
