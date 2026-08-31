import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"
import { requireStoreAccess } from "../lib/store-access"
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
import { apiErrorResponse } from "../lib/api-handler"

export async function getInventory(req: NextRequest) {
	try {
		const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])

		const searchParams = req.nextUrl.searchParams
		const action = searchParams.get("action")

		switch (action) {
			case "overview": {
				const overview = await getInventoryOverview(context.tenantId)
				return NextResponse.json(overview)
			}

			case "low-stock": {
			const requestedThreshold = Number(searchParams.get("threshold") || 10)
			const threshold = Number.isInteger(requestedThreshold) && requestedThreshold >= 0 ? requestedThreshold : 10
				const products = await getLowStockProducts(context.tenantId, threshold)
				return NextResponse.json(products)
			}

			case "out-of-stock": {
				const outOfStock = await getOutOfStockProducts(context.tenantId)
				return NextResponse.json(outOfStock)
			}

			case "alerts": {
				const alerts = await getStockAlerts(context.tenantId)
				return NextResponse.json(alerts)
			}

			case "reorder-suggestions": {
				const requestedDays = Number(searchParams.get("days") || 30)
				const days = Number.isInteger(requestedDays) && requestedDays > 0 ? Math.min(requestedDays, 3650) : 30
				const suggestions = await getReorderSuggestions(context.tenantId, days)
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
				const requestedLimit = Number(searchParams.get("limit") || 20)
				const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20
				const history = await getStockMovementHistory(productId, context.tenantId, limit)
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
		return apiErrorResponse(error, "Failed to fetch inventory data")
	}
}

export async function updateStock(req: NextRequest) {
	try {
		const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])

		const body = await req.json()
		const { productId, variantId, newStock } = body

		if (typeof newStock !== "number" || !Number.isInteger(newStock) || newStock < 0) {
			return NextResponse.json(
				{ message: "newStock must be a non-negative integer" },
				{ status: 400 },
			)
		}

		if (variantId) {
			const variant = await updateVariantStock(variantId, context.tenantId, newStock)
			return NextResponse.json(variant)
		}

		if (!productId) {
			return NextResponse.json(
				{ message: "productId or variantId required" },
				{ status: 400 },
			)
		}

		const product = await updateProductStock(productId, context.tenantId, newStock)
		return NextResponse.json(product)
	} catch (error: any) {
		return apiErrorResponse(error, "Unable to update inventory")
	}
}
