import { NextRequest } from "next/server"
import { getDeliveries } from "backend/controllers/adminDataController"
import { withApiError } from "backend/lib/api-handler"
export async function GET(req: NextRequest) { return withApiError(getDeliveries, req) }
