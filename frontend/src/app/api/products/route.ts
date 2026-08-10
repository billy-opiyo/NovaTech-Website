import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import * as productController from "backend/controllers/productController"

export async function GET(req: NextRequest) {
	const rateLimitResponse = rateLimiter(req)
	if (rateLimitResponse) return rateLimitResponse

	return productController.getProducts(req)
}

export async function POST(req: NextRequest) {
	const rateLimitResponse = rateLimiter(req)
	if (rateLimitResponse) return rateLimitResponse

	return productController.createProduct(req)
}
