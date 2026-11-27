import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { apiErrorResponse } from "backend/lib/api-handler"
import * as productController from "backend/controllers/productController"
import { getCachedFilteredProducts, revalidateTenantPublicCatalog } from "@/lib/public-catalog.server"

export async function GET(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "products")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const context = await resolveTenantFromRequest(req, { includeCommerceSettings: true })
		const result = await getCachedFilteredProducts(req.nextUrl.searchParams, context, { includeReviewDetails: req.nextUrl.searchParams.get("includeReviews") !== "false" })
		return NextResponse.json(result)
	} catch (error: unknown) {
		return apiErrorResponse(error, "Products unavailable")
	}
}

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "products")
	if (rateLimitResponse) return rateLimitResponse

	const response = await productController.createProduct(req)
	if (response.ok) {
		try {
			const context = await resolveTenantFromRequest(req, { allowUnpublished: true })
			revalidateTenantPublicCatalog(context, { storeDirectory: true, platformDiscovery: true, platformStoreHomepage: true })
		} catch (error: unknown) {
			console.error("Product cache invalidation failed", error)
		}
	}
	return response
}
