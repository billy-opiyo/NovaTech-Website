import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import {
	getAnalyticsOverview,
	getSalesData,
	getCategorySales,
	getTopProducts,
	getRegionSales,
	getPaymentMethodStats,
	getGrowthComparison,
} from "backend/services/analytics.service"

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		// Check if user has admin role
		if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
			return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
		}

		const searchParams = req.nextUrl.searchParams
		const timeRange = searchParams.get("timeRange") || "7d"

		// Fetch all analytics data in parallel
		const [overview, salesData, categorySales, topProducts, regionSales, paymentMethods, growth] =
			await Promise.all([
				getAnalyticsOverview(timeRange),
				getSalesData(timeRange),
				getCategorySales(timeRange),
				getTopProducts(timeRange, 5),
				getRegionSales(timeRange),
				getPaymentMethodStats(timeRange),
				getGrowthComparison(timeRange),
			])

		return NextResponse.json({
			overview,
			salesData,
			categorySales,
			topProducts,
			regionSales,
			paymentMethods,
			growth,
		})
	} catch (error: any) {
		console.error("Analytics API error:", error)
		return NextResponse.json(
			{ message: "Failed to fetch analytics data", error: error.message },
			{ status: 500 },
		)
	}
}