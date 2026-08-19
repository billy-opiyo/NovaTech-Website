import { NextRequest } from "next/server"
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "backend/controllers/adminDataController"
import { withApiError } from "backend/lib/api-handler"
export async function GET(req: NextRequest) { return withApiError(getCoupons, req) }
export async function POST(req: NextRequest) { return withApiError(createCoupon, req) }
export async function PATCH(req: NextRequest) { return withApiError(updateCoupon, req) }
export async function DELETE(req: NextRequest) { return withApiError(deleteCoupon, req) }
