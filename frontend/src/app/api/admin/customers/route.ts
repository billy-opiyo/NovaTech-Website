import { NextRequest } from "next/server"
import { getCustomers } from "backend/controllers/adminDataController"
export async function GET(req: NextRequest) { return getCustomers(req) }
