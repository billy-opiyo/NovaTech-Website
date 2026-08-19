import { NextRequest } from "next/server"
import { getAdminLogs, getAdminLogStats, recordAdminAction } from "backend/controllers/adminController"
import { withApiError } from "backend/lib/api-handler"

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams
	if (searchParams.get("stats") === "true") {
		return withApiError(getAdminLogStats, req)
	}
	return withApiError(getAdminLogs, req)
}

export async function POST(req: NextRequest) {
	return withApiError(recordAdminAction, req)
}
