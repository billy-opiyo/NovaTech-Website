import { NextRequest } from "next/server"
import { getAnalytics } from "backend/controllers/analyticsController"

export async function GET(req: NextRequest) {
	return getAnalytics(req)
}