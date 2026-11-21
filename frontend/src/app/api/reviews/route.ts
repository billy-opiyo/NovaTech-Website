import { NextRequest } from "next/server"
import { getServerSession } from "@/lib/auth"
import { rateLimiter } from "backend/middleware/rateLimiter"
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
	return updateReview(req)
}

export async function DELETE(req: NextRequest) {
	return deleteReview(req)
}
