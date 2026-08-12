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
	getAnalyticsExport,
} from "../services/analytics.service"

function isAdmin(role?: string) {
	return role === "ADMIN" || role === "SUPERADMIN"
}

export async function getAnalytics(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		if (!isAdmin(session.user.role)) {
			return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
		}

		const searchParams = req.nextUrl.searchParams
		const timeRange = searchParams.get("timeRange") || "7d"

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

export async function exportAnalytics(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user || !isAdmin(session.user.role)) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const searchParams = req.nextUrl.searchParams
		const timeRange = searchParams.get("timeRange") || "7d"
		const format = searchParams.get("format") === "json" ? "json" : "csv"

		const data = await getAnalyticsExport(timeRange, format)

		if (format === "json") {
			return NextResponse.json(data)
		}

		return new NextResponse(data as string, {
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="analytics-${timeRange}.csv"`,
			},
		})
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}