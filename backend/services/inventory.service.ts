
import prisma from "../lib/db"

export interface LowStockProduct {
	id: string
	name: string
	sku: string
	category: string
	currentStock: number
	threshold: number
	variant?: string
	variantId?: string
	image: string
	price: number
}

export interface InventoryOverview {
	totalProducts: number
	inStockProducts: number
	lowStockProducts: number
	outOfStockProducts: number
	totalInventoryValue: number
	totalStockUnits: number
}

export interface StockAlert {
	id: string
	type: "LOW_STOCK" | "OUT_OF_STOCK" | "REORDER_NEEDED"
	productId: string
	productName: string
	message: string
	severity: "WARNING" | "CRITICAL"
	createdAt: Date
}

export interface ReorderSuggestion {
	productId: string
	productName: string
	currentStock: number
	threshold: number
	suggestedQuantity: number
	estimatedCost: number
	priority: "HIGH" | "MEDIUM" | "LOW"
}

/**
 * Get products with low stock (below threshold but not zero)
 */
export async function getLowStockProducts(tenantId: string, threshold: number = 10): Promise<LowStockProduct[]> {
	const products = await prisma.product.findMany({
		where: { tenantId },
		include: {
			category: true,
			variants: {
				where: {
					tenantId,
					stock: {
						gt: 0,
						lte: threshold,
					},
				},
			},
		},
		orderBy: {
			stock: "asc",
		},
	})

	return products.flatMap((product) => {
		const baseProduct: LowStockProduct = {
			id: product.id,
			name: product.name,
			sku: product.sku,
			category: product.category.name,
			currentStock: product.stock,
			threshold,
			image: product.images[0] || "/placeholder-product.jpg",
			price: product.price,
		}

		if (product.variants.length > 0) {
			return product.variants.filter((variant) => variant.stock > 0 && variant.stock <= threshold).map((variant) => ({
				...baseProduct,
				variant: `${variant.name}: ${variant.value}`,
				variantId: variant.id,
				currentStock: variant.stock,
			}))
		}

		return product.stock > 0 && product.stock <= threshold ? [baseProduct] : []
	})
}

/**
 * Get products that are completely out of stock
 */
export async function getOutOfStockProducts(tenantId: string): Promise<LowStockProduct[]> {
	const products = await prisma.product.findMany({
		where: { tenantId },
		include: {
			category: true,
			variants: {
				where: {
					tenantId,
					stock: 0,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	})

	return products.flatMap((product) => {
		const baseProduct: LowStockProduct = {
			id: product.id,
			name: product.name,
			sku: product.sku,
			category: product.category.name,
			currentStock: 0,
			threshold: 10,
			image: product.images[0] || "/placeholder-product.jpg",
			price: product.price,
		}

		if (product.variants.length > 0) {
			return product.variants.filter((variant) => variant.stock === 0).map((variant) => ({
				...baseProduct,
				variant: `${variant.name}: ${variant.value}`,
				variantId: variant.id,
				currentStock: 0,
			}))
		}

		return product.stock === 0 ? [baseProduct] : []
	})
}

/**
 * Get inventory overview statistics
 */
export async function getInventoryOverview(tenantId: string): Promise<InventoryOverview> {
	const products = await prisma.product.findMany({
		where: { tenantId },
		select: {
			stock: true,
			price: true,
			variants: {
				where: { tenantId },
				select: {
					stock: true,
					priceModifier: true,
				},
			},
		},
	})

	const totalProducts = products.length
	const inStockProducts = products.filter((product) => product.variants.length > 0 ? product.variants.some((variant) => variant.stock > 0) : product.stock > 0).length
	const lowStockProducts = products.filter((product) => product.variants.length > 0 ? product.variants.some((variant) => variant.stock > 0 && variant.stock <= 10) : product.stock > 0 && product.stock <= 10).length
	const outOfStockProducts = products.filter((product) => product.variants.length > 0 ? product.variants.every((variant) => variant.stock === 0) : product.stock === 0).length
	const totalStockUnits = products.reduce((sum, product) => sum + (product.variants.length > 0 ? product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0) : product.stock), 0)
	const totalInventoryValue = products.reduce((sum, product) => {
		if (product.variants.length === 0) return sum + product.price * product.stock
		return sum + product.variants.reduce((variantSum, variant) => variantSum + (product.price + (variant.priceModifier ?? 0)) * variant.stock, 0)
	}, 0)

	return {
		totalProducts,
		inStockProducts,
		lowStockProducts,
		outOfStockProducts,
		totalInventoryValue,
		totalStockUnits,
	}
}

/**
 * Get stock alerts for admin dashboard
 */
export async function getStockAlerts(tenantId: string): Promise<StockAlert[]> {
	const alerts: StockAlert[] = []

	// Get out of stock products
	const outOfStock = await prisma.product.findMany({
		where: {
			tenantId,
			stock: 0,
			variants: { none: { tenantId } },
		},
		include: {
			category: true,
		},
	})

	for (const product of outOfStock) {
		alerts.push({
			id: `out-of-stock-${product.id}`,
			type: "OUT_OF_STOCK",
			productId: product.id,
			productName: product.name,
			message: `${product.name} is out of stock`,
			severity: "CRITICAL",
			createdAt: product.updatedAt,
		})
	}

	// Get low stock products
	const lowStock = await prisma.product.findMany({
		where: {
			tenantId,
			stock: {
				gt: 0,
				lte: 10,
			},
			variants: { none: { tenantId } },
		},
		include: {
			category: true,
		},
	})

	for (const product of lowStock) {
		alerts.push({
			id: `low-stock-${product.id}`,
			type: "LOW_STOCK",
			productId: product.id,
			productName: product.name,
			message: `${product.name} is running low (${product.stock} units remaining)`,
			severity: "WARNING",
			createdAt: product.updatedAt,
		})
	}

	// Check for variants with low/out of stock
	const productsWithVariants = await prisma.product.findMany({
		where: {
			tenantId,
			variants: {
				some: {
					tenantId,
					stock: { lte: 10 },
				},
			},
		},
		include: {
			variants: {
				where: {
					tenantId,
					stock: { lte: 10 },
				},
				select: {
					id: true,
					name: true,
					value: true,
					stock: true,
				},
			},
		},
	})

	for (const product of productsWithVariants) {
		for (const variant of product.variants) {
			const variantName = `${variant.name}: ${variant.value}`
			alerts.push({
				id: `variant-stock-${product.id}-${variant.id}`,
				type: variant.stock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
				productId: product.id,
				productName: product.name,
				message: `${product.name} (${variantName}) has ${variant.stock} units remaining`,
				severity: variant.stock === 0 ? "CRITICAL" : "WARNING",
				createdAt: product.updatedAt,
			})
		}
	}

	return alerts.sort((a, b) => {
		const severityOrder = { CRITICAL: 0, WARNING: 1 }
		return severityOrder[a.severity] - severityOrder[b.severity]
	})
}

/**
 * Get reorder suggestions based on sales velocity and current stock
 */
export async function getReorderSuggestions(tenantId: string, daysToConsider: number = 30): Promise<ReorderSuggestion[]> {
	daysToConsider = Number.isInteger(daysToConsider) && daysToConsider > 0 ? daysToConsider : 30
	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - daysToConsider)

	// Get sales data for the period
	const orders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: {
				gte: cutoffDate,
			},
			status: {
				not: "CANCELLED",
			},
			payments: { some: { status: "COMPLETED" } },
		},
		include: {
			items: {
				where: { tenantId },
				select: {
					productId: true,
					quantity: true,
					variantIds: true,
				},
			},
		},
	})

	// Calculate sales velocity per product
	const salesVelocity = new Map<string, number>()
	const variantSalesVelocity = new Map<string, number>()
	for (const order of orders) {
		for (const item of order.items) {
			if (item.variantIds.length > 0) {
				for (const variantId of item.variantIds) {
					const current = variantSalesVelocity.get(variantId) || 0
					variantSalesVelocity.set(variantId, current + item.quantity)
				}
			} else {
				const current = salesVelocity.get(item.productId) || 0
				salesVelocity.set(item.productId, current + item.quantity)
			}
		}
	}

	// Get all products with stock info
	const products = await prisma.product.findMany({
		where: { tenantId },
		include: {
		variants: {
			where: { tenantId },
			select: {
					id: true,
					name: true,
					value: true,
					stock: true,
					priceModifier: true,
				},
			},
		},
	})

	const suggestions: ReorderSuggestion[] = []

	for (const product of products) {
		const threshold = 10
		if (product.variants.length === 0) {
			const velocity = salesVelocity.get(product.id) || 0
			const dailyVelocity = velocity / daysToConsider
			const currentStock = product.stock
			const daysOfStockRemaining = dailyVelocity > 0 ? currentStock / dailyVelocity : Infinity

			// Suggest reorder if stock is low or will run out soon (within 14 days)
			if (currentStock <= threshold || (dailyVelocity > 0 && daysOfStockRemaining < 14)) {
				const suggestedQuantity = Math.max(
					Math.ceil(dailyVelocity * 30), // 30 days supply
					threshold - currentStock + 10 // Minimum buffer
				)

				const priority =
					currentStock === 0
						? "HIGH"
						: dailyVelocity > 0 && daysOfStockRemaining < 7
							? "HIGH"
							: dailyVelocity > 0 && daysOfStockRemaining < 14
								? "MEDIUM"
								: "LOW"

				suggestions.push({
					productId: product.id,
					productName: product.name,
					currentStock,
					threshold,
					suggestedQuantity,
					estimatedCost: suggestedQuantity * product.price,
					priority,
				})
			}
		}

		// Check variants using the durable variant IDs stored on new order items.
		for (const variant of product.variants) {
			const variantStock = variant.stock
			const variantDailyVelocity = (variantSalesVelocity.get(variant.id) || 0) / daysToConsider
			const variantDaysRemaining = variantDailyVelocity > 0 ? variantStock / variantDailyVelocity : Infinity

			if (variantStock <= threshold || (variantDailyVelocity > 0 && variantDaysRemaining < 14)) {
				const suggestedQty = Math.max(Math.ceil(variantDailyVelocity * 30), threshold - variantStock + 10)

				const priority = variantStock === 0 || variantDaysRemaining < 7 ? "HIGH" : variantDaysRemaining < 14 ? "MEDIUM" : "LOW"

				suggestions.push({
					productId: product.id,
					productName: `${product.name} (${variant.name}: ${variant.value})`,
					currentStock: variantStock,
					threshold,
					suggestedQuantity: suggestedQty,
					estimatedCost: suggestedQty * (product.price + (variant.priceModifier ?? 0)),
					priority,
				})
			}
		}
	}

	return suggestions.sort((a, b) => {
		const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
		return priorityOrder[a.priority] - priorityOrder[b.priority]
	})
}

/**
 * Update product stock (used by admin)
 */
export async function updateProductStock(productId: string, tenantId: string, newStock: number) {
	if (!Number.isInteger(newStock) || newStock < 0) {
		throw new Error("Stock must be a non-negative integer")
	}

	const existing = await prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } })
	if (!existing) throw new Error("Product not found")

	return prisma.product.update({
		where: { id: existing.id },
		data: { stock: newStock },
	})
}

/**
 * Update variant stock (used by admin)
 */
export async function updateVariantStock(variantId: string, tenantId: string, newStock: number) {
	if (!Number.isInteger(newStock) || newStock < 0) {
		throw new Error("Stock must be a non-negative integer")
	}

	const existing = await prisma.variant.findFirst({ where: { id: variantId, tenantId }, select: { id: true } })
	if (!existing) throw new Error("Variant not found")

	return prisma.variant.update({
		where: { id: existing.id },
		data: { stock: newStock },
	})
}

/**
 * Get stock movement history (simplified - based on order items)
 */
export async function getStockMovementHistory(productId: string, tenantId: string, limit: number = 20) {
	const orders = await prisma.order.findMany({
		where: {
			tenantId,
			payments: { some: { status: "COMPLETED" } },
			items: {
				some: {
					productId,
					tenantId,
				},
			},
		},
		include: {
			items: {
				where: {
					productId,
					tenantId,
				},
				select: {
					quantity: true,
					price: true,
					order: {
						select: {
							id: true,
							createdAt: true,
							status: true,
						},
					},
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		take: limit,
	})

	return orders.map((order) => ({
		orderId: order.id,
		date: order.createdAt,
		quantity: order.items[0]?.quantity || 0,
		price: order.items[0]?.price || 0,
		status: order.status,
		type: order.status === "CANCELLED" ? "RETURN" : "SALE",
	}))
}
