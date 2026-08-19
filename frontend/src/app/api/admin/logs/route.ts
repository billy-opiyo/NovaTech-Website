import { NextRequest } from "next/server"
import { getAdminLogs, getAdminLogStats, recordAdminAction } from "backend/controllers/adminController"

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams
	if (searchParams.get("stats") === "true") {
		return getAdminLogStats(req)
	}
	return getAdminLogs(req)
}

export async function POST(req: NextRequest) {
	return recordAdminAction(req)
}
