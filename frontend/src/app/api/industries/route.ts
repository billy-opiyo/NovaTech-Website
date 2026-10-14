import { NextResponse } from "next/server"
import prisma from "backend/lib/db"

export async function GET() {
	try {
		const industries = await prisma.industry.findMany({
			where: { active: true },
			select: { id: true, name: true, slug: true, description: true, icon: true },
			orderBy: { name: "asc" },
		})
		return NextResponse.json({ industries }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } })
	} catch (error: unknown) {
		console.error("Public industry list unavailable", error)
		return NextResponse.json({ message: "Industries are unavailable" }, { status: 503 })
	}
}
