import { NextResponse } from "next/server"
import prisma from "backend/lib/db"
import { getRequestId, logEvent, withRequestId } from "backend/lib/observability"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
	const requestId = getRequestId(request)
	try {
		await prisma.$queryRaw`SELECT 1`
		return withRequestId(NextResponse.json({ ok: true, application: "up", database: "up", requestId, timestamp: new Date().toISOString() }), requestId)
	} catch (error) {
		logEvent("error", "health_database_failed", { requestId, route: "/api/health" }, { message: error })
		return withRequestId(NextResponse.json({ ok: false, application: "up", database: "down", requestId, timestamp: new Date().toISOString() }, { status: 503 }), requestId)
	}
}
