
import prisma from "../lib/db"

export interface LowStockProduct {
	id: string
	name: string
	sku: string
	category: string
	currentStock: number
	threshold: number
	variant?: string
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
		where: {
			tenantId,
			stock: {
				gt: 0,
				lte: threshold,
			},
		},
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
			return product.variants.map((variant) => ({
				...baseProduct,
				variant: `${variant.name}: ${variant.value}`,
				currentStock: variant.stock,
			}))
		}

		return [baseProduct]
	})
}

/**
 * Get products that are completely out of stock
 */
export async function getOutOfStockProducts(tenantId: string): Promise<LowStockProduct[]> {
	const products = await prisma.product.findMany({
		where: {
			tenantId,
			OR: [
				{ stock: 0, variants: { none: {} } },
				{
					stock: 0,
					variants: { some: {} },
				},
			],
		},
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
			return product.variants.map((variant) => ({
				...baseProduct,
				variant: `${variant.name}: ${variant.value}`,
				currentStock: 0,
			}))
		}

		return [baseProduct]
	})
}

/**
 * Get inventory overview statistics
 */
export async function getInventoryOverview(tenantId: string): Promise<InventoryOverview> {
	const [
		totalProducts,
		inStockProducts,
		lowStockProducts,
		outOfStockProducts,
		inventoryValue,
	] = await Promise.all([
		prisma.product.count({ where: { tenantId } }),
		prisma.product.count({
			where: {
				tenantId,
				stock: {
					gt: 10,
				},
			},
		}),
		prisma.product.count({
			where: {
				tenantId,
				stock: {
					gt: 0,
					lte: 10,
				},
			},
		}),
		prisma.product.count({
			where: {
				tenantId,
				stock: 0,
			},
		}),
		prisma.product.aggregate({
			where: { tenantId },
			_sum: {
				stock: true,
			},
		}),
	])

	const productsWithValue = await prisma.product.findMany({
		where: { tenantId },
		select: {
			stock: true,
			price: true,
			variants: {
				select: {
					stock: true,
					priceModifier: true,
				},
			},
		},
	})

	const totalInventoryValue = productsWithValue.reduce((sum, product) => {
		const baseValue = product.price * product.stock
		const variantValue = product.variants.reduce(
			(vSum, variant) => vSum + (product.price + (variant.priceModifier ?? 0)) * variant.stock,
			0
		)
		return sum + baseValue + variantValue
	}, 0)

	return {
		totalProducts,
		inStockProducts,
		lowStockProducts,
		outOfStockProducts,
		totalInventoryValue,
		totalStockUnits: inventoryValue._sum.stock || 0,
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
					stock: 0,
				},
			},
		},
		include: {
			variants: {
				where: {
					tenantId,
					stock: 0,
				},
				take: 1,
				select: {
					name: true,
				},
			},
		},
	})

	for (const product of productsWithVariants) {
		const variantName = product.variants[0]?.name || "variant"
		alerts.push({
			id: `variant-out-of-stock-${product.id}-${variantName}`,
			type: "OUT_OF_STOCK",
			productId: product.id,
			productName: product.name,
			message: `${product.name} (${variantName}) is out of stock`,
			severity: "CRITICAL",
			createdAt: product.updatedAt,
		})
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
		},
		include: {
			items: {
				select: {
					productId: true,
					quantity: true,
				},
			},
		},
	})

	// Calculate sales velocity per product
	const salesVelocity = new Map<string, number>()
	for (const order of orders) {
		for (const item of order.items) {
			const current = salesVelocity.get(item.productId) || 0
			salesVelocity.set(item.productId, current + item.quantity)
		}
	}

	// Get all products with stock info
	const products = await prisma.product.findMany({
		where: { tenantId },
		include: {
			variants: {
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
		const velocity = salesVelocity.get(product.id) || 0
		const dailyVelocity = velocity / daysToConsider
		const currentStock = product.stock
		const threshold = 10
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

		// Check variants (threshold-based; OrderItem has no variantId relation,
		// so per-variant sales velocity cannot be computed)
		for (const variant of product.variants) {
			const variantStock = variant.stock

			if (variantStock <= threshold) {
				const suggestedQty = Math.max(10, threshold - variantStock + 10)

				const priority = variantStock === 0 ? "HIGH" : "LOW"

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
	if (newStock < 0) {
		throw new Error("Stock cannot be negative")
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
	if (newStock < 0) {
		throw new Error("Stock cannot be negative")
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
			items: {
				some: {
					productId,
				},
			},
		},
		include: {
			items: {
				where: {
					productId,
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
