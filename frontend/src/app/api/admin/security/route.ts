import { NextRequest } from "next/server"
import { getSecurity } from "backend/controllers/adminDataController"
import { withApiError } from "backend/lib/api-handler"
export async function GET(req: NextRequest) { return withApiError(getSecurity, req) }
