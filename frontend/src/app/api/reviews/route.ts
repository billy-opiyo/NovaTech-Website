import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { z } from "zod"

const reviewSchema = z.object({
	productId: z.string(),
	rating: z.number().int().min(1).max(5),
	title: z.string().min(3).max(200).optional(),
	comment: z.string().min(10).max(1000).optional(),
	photos: z.array(z.string().url()).optional(),
})

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const productId = url.searchParams.get("productId")
		const page = parseInt(url.searchParams.get("page") || "1")
		const limit = parseInt(url.searchParams.get("limit") || "10")

		if (!productId) {
			return NextResponse.json(
				{ message: "Product ID required" },
				{ status: 400 },
			)
		}

		const [reviews, total] = await Promise.all([
			prisma.review.findMany({
				where: { productId },
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
			prisma.review.count({ where: { productId } }),
		])

		return NextResponse.json({
			reviews,
			total,
			page,
			totalPages: Math.ceil(total / limit),
			averageRating:
				total > 0
					? (
							await prisma.review.aggregate({
								where: { productId },
								_avg: { rating: true },
							})
						)._avg.rating
					: 0,
		})
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
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

		const review = await prisma.review.create({
			data: {
				userId,
				productId: validated.productId,
				rating: validated.rating,
				title: validated.title,
				comment: validated.comment,
				photos: validated.photos || [],
				isVerifiedPurchase: !!hasPurchased,
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

		return NextResponse.json(review, { status: 201 })
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

export async function PUT(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const { reviewId, rating, title, comment } = await req.json()

		const review = await prisma.review.findUnique({ where: { id: reviewId } })

		if (!review || review.userId !== session.user.id) {
			return NextResponse.json(
				{ message: "Review not found or unauthorized" },
				{ status: 404 },
			)
		}

		const updated = await prisma.review.update({
			where: { id: reviewId },
			data: { rating, title, comment },
		})

		return NextResponse.json(updated)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		const { reviewId } = await req.json()
		const review = await prisma.review.findUnique({ where: { id: reviewId } })

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

		await prisma.review.delete({ where: { id: reviewId } })

		return NextResponse.json({ message: "Review deleted" })
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
