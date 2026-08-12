import { NextRequest } from "next/server"
import { getSecurity } from "backend/controllers/adminDataController"
export async function GET(req: NextRequest) { return getSecurity(req) }
