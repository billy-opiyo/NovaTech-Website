import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import {
	getInventoryOverview,
	getLowStockProducts,
	getOutOfStockProducts,
	getStockAlerts,
	getReorderSuggestions,
} from "backend/services/inventory.service"

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
		const action = searchParams.get("action")

		switch (action) {
			case "overview":
				const overview = await getInventoryOverview()
				return NextResponse.json(overview)

			case "low-stock": {
				const threshold = parseInt(searchParams.get("threshold") || "10")
				const products = await getLowStockProducts(threshold)
				return NextResponse.json(products)
			}

			case "out-of-stock":
				const outOfStock = await getOutOfStockProducts()
				return NextResponse.json(outOfStock)

			case "alerts":
				const alerts = await getStockAlerts()
				return NextResponse.json(alerts)

			case "reorder-suggestions": {
				const days = parseInt(searchParams.get("days") || "30")
				const suggestions = await getReorderSuggestions(days)
				return NextResponse.json(suggestions)
			}

			default:
				return NextResponse.json(
					{ message: "Invalid action parameter" },
					{ status: 400 },
				)
		}
	} catch (error: any) {
		console.error("Inventory API error:", error)
		return NextResponse.json(
			{ message: "Failed to fetch inventory data", error: error.message },
			{ status: 500 },
		)
	}
}
