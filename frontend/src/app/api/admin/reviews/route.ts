import { NextRequest } from "next/server"
import { getAdminReviews, moderateReview } from "backend/controllers/adminDataController"
export async function GET(req: NextRequest) { return getAdminReviews(req) }
export async function PATCH(req: NextRequest) { return moderateReview(req) }
