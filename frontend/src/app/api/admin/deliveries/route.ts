import { NextRequest } from "next/server"
import { getDeliveries } from "backend/controllers/adminDataController"
export async function GET(req: NextRequest) { return getDeliveries(req) }
