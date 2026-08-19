import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { MembershipRole } from "@prisma/client"
import { resolveTenantFromRequest } from "../lib/tenant"
import { requireMembership } from "../lib/tenant-access"
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

async function analyticsAccess(req: NextRequest) {
	const session = await getServerSession()
	if (!session?.user?.id) throw Object.assign(new Error("Unauthorized"), { status: 401 })
	const context = await resolveTenantFromRequest(req)
	await requireMembership(session.user.id, context.tenantId, [
		MembershipRole.STORE_OWNER,
		MembershipRole.STORE_ADMIN,
		MembershipRole.STORE_MANAGER,
	])
	return context
}

export async function getAnalytics(req: NextRequest) {
	try {
		const context = await analyticsAccess(req)

		const searchParams = req.nextUrl.searchParams
		const timeRange = searchParams.get("timeRange") || "7d"

		const [overview, salesData, categorySales, topProducts, regionSales, paymentMethods, growth] =
			await Promise.all([
				getAnalyticsOverview(context.tenantId, timeRange),
				getSalesData(context.tenantId, timeRange),
				getCategorySales(context.tenantId, timeRange),
				getTopProducts(context.tenantId, timeRange, 5),
				getRegionSales(context.tenantId, timeRange),
				getPaymentMethodStats(context.tenantId, timeRange),
				getGrowthComparison(context.tenantId, timeRange),
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
			{ status: error?.status || 500 },
		)
	}
}

export async function exportAnalytics(req: NextRequest) {
	try {
		const context = await analyticsAccess(req)

		const searchParams = req.nextUrl.searchParams
		const timeRange = searchParams.get("timeRange") || "7d"
		const format = searchParams.get("format") === "json" ? "json" : "csv"

		const data = await getAnalyticsExport(context.tenantId, timeRange, format)

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
		return NextResponse.json({ message: error.message }, { status: error?.status || 500 })
	}
}
