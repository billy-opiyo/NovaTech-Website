import { NextRequest } from "next/server"
import { getProductBySlug } from "backend/controllers/productController"

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	return getProductBySlug((await params).slug)
}
