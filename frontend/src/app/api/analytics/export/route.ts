import { NextRequest } from "next/server"
import { exportAnalytics } from "backend/controllers/analyticsController"

export async function GET(req: NextRequest) {
	return exportAnalytics(req)
}