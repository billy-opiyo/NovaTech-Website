import { NextRequest } from "next/server"
import { deleteAdminReview, getAdminReviews, moderateReview } from "backend/controllers/adminDataController"
import { withApiError } from "backend/lib/api-handler"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { revalidateTenantPublicCatalog } from "@/lib/public-catalog.server"
export async function GET(req: NextRequest) { return withApiError(getAdminReviews, req) }
async function invalidateReviewPublicContent(request: NextRequest) {
	try {
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		revalidateTenantPublicCatalog(context, { platformDiscovery: true })
	} catch (error: unknown) {
		console.error("Review cache invalidation failed", error)
	}
}
export async function PATCH(req: NextRequest) {
	const response = await withApiError(moderateReview, req)
	if (response.ok) await invalidateReviewPublicContent(req)
	return response
}
export async function DELETE(req: NextRequest) {
	const response = await withApiError(deleteAdminReview, req)
	if (response.ok) await invalidateReviewPublicContent(req)
	return response
}
