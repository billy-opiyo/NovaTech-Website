import { NextRequest } from "next/server"
import { getReviews, createReview, updateReview, deleteReview } from "backend/controllers/reviewController"

export async function GET(req: NextRequest) {
	return getReviews(req)
}

export async function POST(req: NextRequest) {
	return createReview(req)
}

export async function PUT(req: NextRequest) {
	return updateReview(req)
}

export async function DELETE(req: NextRequest) {
	return deleteReview(req)
}