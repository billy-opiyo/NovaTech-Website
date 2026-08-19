import { NextRequest } from "next/server"
import { getCustomers } from "backend/controllers/adminDataController"
import { withApiError } from "backend/lib/api-handler"
export async function GET(req: NextRequest) { return withApiError(getCustomers, req) }
