import { NextRequest } from "next/server"
import { getServerSession } from "@/lib/auth"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { revalidateTenantPublicCatalog } from "@/lib/public-catalog.server"
import { getReviews, createReview, updateReview, deleteReview } from "backend/controllers/reviewController"

export async function GET(req: NextRequest) {
	return getReviews(req)
}

export async function POST(req: NextRequest) {
	const session = await getServerSession()
	const ipLimited = await rateLimiter(req, "review")
	if (ipLimited) return ipLimited
	if (session?.user?.id) {
		const accountLimited = await rateLimiter(req, "review-account", session.user.id)
		if (accountLimited) return accountLimited
	}
	return createReview(req)
}

export async function PUT(req: NextRequest) {
	const session = await getServerSession()
	const ipLimited = await rateLimiter(req, "review")
	if (ipLimited) return ipLimited
	if (session?.user?.id) {
		const accountLimited = await rateLimiter(req, "review-account", session.user.id)
		if (accountLimited) return accountLimited
	}
	const response = await updateReview(req)
	if (response.ok) await invalidateReviewPublicContent(req)
	return response
}

export async function DELETE(req: NextRequest) {
	const response = await deleteReview(req)
	if (response.ok) await invalidateReviewPublicContent(req)
	return response
}

async function invalidateReviewPublicContent(request: NextRequest) {
	try {
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		revalidateTenantPublicCatalog(context, { platformDiscovery: true })
	} catch (error: unknown) {
		console.error("Review cache invalidation failed", error)
	}
}
