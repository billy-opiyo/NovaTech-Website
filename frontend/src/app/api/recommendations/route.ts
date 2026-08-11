import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import {
	getRecommendedForUser,
	getTrendingProducts,
	getSimilarProducts,
	getFeaturedProducts,
	getNewArrivals,
	getDeals,
} from "backend/services/recommendation.service"

export async function GET(req: NextRequest) {
	try {
		const searchParams = req.nextUrl.searchParams
		const type = searchParams.get("type") || "trending"
		const limit = parseInt(searchParams.get("limit") || "12")
		const productId = searchParams.get("productId")
		const userId = searchParams.get("userId")

		// Validate limit
		const validatedLimit = Math.min(Math.max(limit, 1), 50)

		switch (type) {
			case "personalized": {
				// Get session for user-specific recommendations
				const session = await getServerSession()
				if (!session?.user) {
					return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
				}

				const recommendations = await getRecommendedForUser(
					session.user.id,
					validatedLimit,
				)
				return NextResponse.json({ recommendations, type: "personalized" })
			}

			case "trending": {
				const trending = await getTrendingProducts(validatedLimit)
				return NextResponse.json({ products: trending, type: "trending" })
			}

			case "similar": {
				if (!productId) {
					return NextResponse.json(
						{ message: "productId is required for similar products" },
						{ status: 400 },
					)
				}

				const similar = await getSimilarProducts(productId, validatedLimit)
				return NextResponse.json({ products: similar, type: "similar" })
			}

			case "featured": {
				const featured = await getFeaturedProducts(validatedLimit)
				return NextResponse.json({ products: featured, type: "featured" })
			}

			case "new-arrivals": {
				const newArrivals = await getNewArrivals(validatedLimit)
				return NextResponse.json({ products: newArrivals, type: "new-arrivals" })
			}

			case "deals": {
				const deals = await getDeals(validatedLimit)
				return NextResponse.json({ products: deals, type: "deals" })
			}

			default: {
				return NextResponse.json(
					{
						message: "Invalid type parameter",
						validTypes: ["personalized", "trending", "similar", "featured", "new-arrivals", "deals"],
					},
					{ status: 400 },
				)
			}
		}
	} catch (error: any) {
		console.error("Recommendations API error:", error)
		return NextResponse.json(
			{ message: "Failed to fetch recommendations", error: error.message },
			{ status: 500 },
		)
	}
}