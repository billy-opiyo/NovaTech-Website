import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getAnalyticsExport } from "backend/services/analytics.service"

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
			return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
		}

		const searchParams = req.nextUrl.searchParams
		const timeRange = searchParams.get("timeRange") || "7d"
		const format = searchParams.get("format") || "csv"

		const data = await getAnalyticsExport(timeRange, format as "csv" | "json")

		if (format === "json") {
			return NextResponse.json(data)
		}

		// CSV format
		const csvData = data as string
		const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
		const filename = `analytics-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`

		return new NextResponse(blob, {
			headers: {
				"Content-Type": "text/csv;charset=utf-8;",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		})
	} catch (error: any) {
		console.error("Analytics export API error:", error)
		return NextResponse.json(
			{ message: "Failed to export analytics data", error: error.message },
			{ status: 500 },
		)
	}
}