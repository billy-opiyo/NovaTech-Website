import { NextRequest } from "next/server"
import { deleteAdminReview, getAdminReviews, moderateReview } from "backend/controllers/adminDataController"
import { withApiError } from "backend/lib/api-handler"
export async function GET(req: NextRequest) { return withApiError(getAdminReviews, req) }
export async function PATCH(req: NextRequest) { return withApiError(moderateReview, req) }
export async function DELETE(req: NextRequest) { return withApiError(deleteAdminReview, req) }
