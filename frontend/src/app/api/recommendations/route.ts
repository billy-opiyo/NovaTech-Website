import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import {
	getRecommendedForUser,
	getTrendingProducts,
	getSimilarProducts,
	getFeaturedProducts,
	getNewArrivals,
	getDeals,
} from "backend/services/recommendation.service"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function GET(req: NextRequest) {
	try {
		const context = await resolveTenantFromRequest(req)
		const searchParams = req.nextUrl.searchParams
		const type = searchParams.get("type") || "trending"
		const parsedLimit = Number(searchParams.get("limit") || 12)
		const productId = searchParams.get("productId")
		const userId = searchParams.get("userId")

		// Validate limit
		const validatedLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 12

		switch (type) {
			case "personalized": {
				// Get session for user-specific recommendations
				const session = await getServerSession()
				if (!session?.user) {
					return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
				}

				const recommendations = await getRecommendedForUser(
					session.user.id,
					context.tenantId,
					validatedLimit,
				)
				return NextResponse.json({ recommendations, type: "personalized" })
			}

			case "trending": {
				const trending = await getTrendingProducts(context.tenantId, validatedLimit)
				return NextResponse.json({ products: trending, type: "trending" })
			}

			case "similar": {
				if (!productId) {
					return NextResponse.json(
						{ message: "productId is required for similar products" },
						{ status: 400 },
					)
				}

				const similar = await getSimilarProducts(productId, context.tenantId, validatedLimit)
				return NextResponse.json({ products: similar, type: "similar" })
			}

			case "featured": {
				const featured = await getFeaturedProducts(context.tenantId, validatedLimit)
				return NextResponse.json({ products: featured, type: "featured" })
			}

			case "new-arrivals": {
				const newArrivals = await getNewArrivals(context.tenantId, validatedLimit)
				return NextResponse.json({ products: newArrivals, type: "new-arrivals" })
			}

			case "deals": {
				const deals = await getDeals(context.tenantId, validatedLimit)
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
		return apiErrorResponse(error, "Failed to fetch recommendations")
	}
}
