import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import {
	getInventoryOverview,
	getLowStockProducts,
	getOutOfStockProducts,
	getStockAlerts,
	getReorderSuggestions,
	updateProductStock,
	updateVariantStock,
	getStockMovementHistory,
} from "../services/inventory.service"

function isAdmin(role?: string) {
	return role === "ADMIN" || role === "SUPERADMIN"
}

export async function getInventory(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		if (!isAdmin(session.user.role)) {
			return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
		}

		const searchParams = req.nextUrl.searchParams
		const action = searchParams.get("action")

		switch (action) {
			case "overview": {
				const overview = await getInventoryOverview()
				return NextResponse.json(overview)
			}

			case "low-stock": {
				const threshold = parseInt(searchParams.get("threshold") || "10", 10)
				const products = await getLowStockProducts(threshold)
				return NextResponse.json(products)
			}

			case "out-of-stock": {
				const outOfStock = await getOutOfStockProducts()
				return NextResponse.json(outOfStock)
			}

			case "alerts": {
				const alerts = await getStockAlerts()
				return NextResponse.json(alerts)
			}

			case "reorder-suggestions": {
				const days = parseInt(searchParams.get("days") || "30", 10)
				const suggestions = await getReorderSuggestions(days)
				return NextResponse.json(suggestions)
			}

			case "movement": {
				const productId = searchParams.get("productId")
				if (!productId) {
					return NextResponse.json(
						{ message: "productId query parameter required" },
						{ status: 400 },
					)
				}
				const limit = parseInt(searchParams.get("limit") || "20", 10)
				const history = await getStockMovementHistory(productId, limit)
				return NextResponse.json(history)
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

export async function updateStock(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user || !isAdmin(session.user.role)) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const body = await req.json()
		const { productId, variantId, newStock } = body

		if (typeof newStock !== "number" || newStock < 0) {
			return NextResponse.json(
				{ message: "newStock must be a non-negative number" },
				{ status: 400 },
			)
		}

		if (variantId) {
			const variant = await updateVariantStock(variantId, newStock)
			return NextResponse.json(variant)
		}

		if (!productId) {
			return NextResponse.json(
				{ message: "productId or variantId required" },
				{ status: 400 },
			)
		}

		const product = await updateProductStock(productId, newStock)
		return NextResponse.json(product)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}