import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "../lib/db"
import { reviewSchema, updateReviewSchema, deleteReviewSchema } from "../validators/reviewValidator"
import { z } from "zod"
import { findBlockedReviewTerms } from "../constants/reviewModeration"

export async function getReviews(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const productId = url.searchParams.get("productId")
		const page = parseInt(url.searchParams.get("page") || "1", 10)
		const limit = parseInt(url.searchParams.get("limit") || "10", 10)

		if (!productId) {
			return NextResponse.json(
				{ message: "Product ID required" },
				{ status: 400 },
			)
		}

		const approvedWhere = { productId, moderationStatus: "APPROVED" as const }
		const [reviews, total] = await Promise.all([
			prisma.review.findMany({
				where: approvedWhere,
				include: {
					user: {
						select: {
							name: true,
							image: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.review.count({ where: approvedWhere }),
		])

		const avg = await prisma.review.aggregate({
			where: approvedWhere,
			_avg: { rating: true },
		})

		return NextResponse.json({
			reviews,
			total,
			page,
			totalPages: Math.ceil(total / limit),
			averageRating: total > 0 ? avg._avg.rating : 0,
		})
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function createReview(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const body = await req.json()
		const validated = reviewSchema.parse(body)
		const userId = session.user.id

		if (!userId) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const hasPurchased = await prisma.orderItem.findFirst({
			where: {
				productId: validated.productId,
				order: {
					userId,
					status: "DELIVERED",
				},
			},
		})
		const blockedTerms = findBlockedReviewTerms(validated.title, validated.comment)

		const review = await prisma.review.create({
			data: {
				userId,
				productId: validated.productId,
				rating: validated.rating,
				title: validated.title,
				comment: validated.comment,
				photos: validated.photos || [],
				isVerifiedPurchase: !!hasPurchased,
				moderationStatus: "PENDING",
			},
			include: {
				user: {
					select: {
						name: true,
						image: true,
					},
				},
			},
		})

		return NextResponse.json({
			...review,
			message: blockedTerms.length
				? "Your review was submitted for admin moderation before publication."
				: "Your review was submitted and is awaiting admin approval.",
		}, { status: 201 })
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function updateReview(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const body = await req.json()
		const validated = updateReviewSchema.parse(body)

		const review = await prisma.review.findUnique({ where: { id: validated.reviewId } })

		if (!review || review.userId !== session.user.id) {
			return NextResponse.json(
				{ message: "Review not found or unauthorized" },
				{ status: 404 },
			)
		}
		const blockedTerms = findBlockedReviewTerms(validated.title, validated.comment)

		const updated = await prisma.review.update({
			where: { id: validated.reviewId },
			data: {
				rating: validated.rating,
				title: validated.title,
				comment: validated.comment,
				moderationStatus: "PENDING",
			},
		})

		return NextResponse.json({
			...updated,
			message: blockedTerms.length
				? "Your edited review was returned to admin moderation before publication."
				: "Your edited review is awaiting admin approval.",
		})
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function deleteReview(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const body = await req.json()
		const validated = deleteReviewSchema.parse(body)

		const review = await prisma.review.findUnique({ where: { id: validated.reviewId } })

		if (!review) {
			return NextResponse.json({ message: "Review not found" }, { status: 404 })
		}

		if (
			review.userId !== session.user.id &&
			session.user.role !== "ADMIN" &&
			session.user.role !== "SUPERADMIN"
		) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		await prisma.review.delete({ where: { id: validated.reviewId } })

		return NextResponse.json({ message: "Review deleted" })
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
