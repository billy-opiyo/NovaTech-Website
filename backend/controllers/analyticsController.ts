import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { resolveTenantFromRequest } from "../lib/tenant"
import { requireStorePermission } from "../lib/tenant-access"
import { getTenantEntitlement } from "../billing/subscription"
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
import { apiErrorResponse } from "../lib/api-handler"

async function analyticsAccess(req: NextRequest) {
	const session = await getServerSession()
	if (!session?.user?.id) throw Object.assign(new Error("Unauthorized"), { status: 401 })
	const context = await resolveTenantFromRequest(req)
	await requireStorePermission(session.user.id, context.tenantId, "VIEW_ANALYTICS")
	const platformAdmin = ["ADMIN", "SUPERADMIN"].includes(String(session.user.role)) || ["PLATFORM_OWNER", "PLATFORM_ADMIN", "PLATFORM_ANALYST"].includes(String(session.user.platformRole))
	const analyticsLevel = platformAdmin ? "advanced" : await getTenantEntitlement(context.tenantId, "analyticsLevel", "basic")
	return { context, advancedAvailable: analyticsLevel === "advanced" }
}

export async function getAnalytics(req: NextRequest) {
	try {
		const access = await analyticsAccess(req)
		const context = access.context

		const searchParams = req.nextUrl.searchParams
		const timeRange = searchParams.get("timeRange") || "7d"

		const [overview, salesData, categorySales, topProducts, regionSales, paymentMethods, growth] =
			await Promise.all([
				getAnalyticsOverview(context.tenantId, timeRange),
				getSalesData(context.tenantId, timeRange),
				access.advancedAvailable ? getCategorySales(context.tenantId, timeRange) : Promise.resolve([]),
				getTopProducts(context.tenantId, timeRange, 5),
				access.advancedAvailable ? getRegionSales(context.tenantId, timeRange) : Promise.resolve([]),
				access.advancedAvailable ? getPaymentMethodStats(context.tenantId, timeRange) : Promise.resolve([]),
				access.advancedAvailable ? getGrowthComparison(context.tenantId, timeRange) : Promise.resolve(null),
			])

		return NextResponse.json({
			overview,
			salesData,
			categorySales,
			topProducts,
			regionSales,
			paymentMethods,
			growth,
			analyticsLevel: access.advancedAvailable ? "advanced" : "basic",
			advancedAvailable: access.advancedAvailable,
		})
	} catch (error: any) {
		console.error("Analytics API error:", error)
		return apiErrorResponse(error, "Failed to fetch analytics data")
	}
}

export async function exportAnalytics(req: NextRequest) {
	try {
		const access = await analyticsAccess(req)
		const context = access.context
		if (!access.advancedAvailable) return NextResponse.json({ message: "Advanced analytics exports require the Business or Enterprise plan.", code: "ANALYTICS_LEVEL_UPGRADE_REQUIRED" }, { status: 409 })

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
		return apiErrorResponse(error, "Analytics export unavailable")
	}
}
