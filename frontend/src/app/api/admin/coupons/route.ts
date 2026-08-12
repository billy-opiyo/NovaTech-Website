import { NextRequest } from "next/server"
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "backend/controllers/adminDataController"
export async function GET(req: NextRequest) { return getCoupons(req) }
export async function POST(req: NextRequest) { return createCoupon(req) }
export async function PATCH(req: NextRequest) { return updateCoupon(req) }
export async function DELETE(req: NextRequest) { return deleteCoupon(req) }
