import prisma from "../lib/db"

export interface AnalyticsOverview {
	totalRevenue: number
	totalOrders: number
	averageOrderValue: number
	conversionRate: number
}

export interface SalesData {
	period: string
	revenue: number
	orders: number
}

export interface CategorySales {
	category: string
	sales: number
	percentage: number
}

export interface TopProduct {
	id: string
	name: string
	category: string
	sales: number
	revenue: number
	image: string
	growth: number
}

export interface RegionSales {
	region: string
	sales: number
	orders: number
}

export interface PaymentMethodStats {
	method: string
	percentage: number
	amount: number
	orders: number
}

export interface GrowthComparison {
	revenueGrowth: number
	ordersGrowth: number
	aovGrowth: number
	conversionGrowth: number
	currentPeriod: {
		revenue: number
		orders: number
		aov: number
		conversion: number
	}
	previousPeriod: {
		revenue: number
		orders: number
		aov: number
		conversion: number
	}
}

function getDateRange(timeRange: string): { startDate: Date; endDate: Date } {
	const now = new Date()
	const startDate = new Date()

	switch (timeRange) {
		case "7d":
			startDate.setDate(now.getDate() - 7)
			break
		case "30d":
			startDate.setDate(now.getDate() - 30)
			break
		case "3m":
			startDate.setMonth(now.getMonth() - 3)
			break
		case "1y":
			startDate.setFullYear(now.getFullYear() - 1)
			break
		default:
			startDate.setDate(now.getDate() - 7)
	}

	return { startDate, endDate: now }
}

function getPreviousDateRange(timeRange: string): { startDate: Date; endDate: Date } {
	const { startDate, endDate } = getDateRange(timeRange)
	const duration = endDate.getTime() - startDate.getTime()
	const previousEndDate = new Date(startDate.getTime() - 1)
	const previousStartDate = new Date(previousEndDate.getTime() - duration)

	return { startDate: previousStartDate, endDate: previousEndDate }
}

export async function getAnalyticsOverview(tenantId: string, timeRange: string = "7d"): Promise<AnalyticsOverview> {
	const { startDate, endDate } = getDateRange(timeRange)

	const orders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			status: {
				not: "CANCELLED",
			},
		},
		select: {
			total: true,
			id: true,
			items: {
				where: { tenantId },
				select: {
					productId: true,
				},
			},
		},
	})

	const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
	const totalOrders = orders.length
	const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

	const completedOrders = await prisma.order.count({
		where: {
			tenantId,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			payments: {
				some: {
					status: "COMPLETED",
				},
			},
		},
	})

	const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

	return {
		totalRevenue,
		totalOrders,
		averageOrderValue,
		conversionRate,
	}
}

export async function getGrowthComparison(tenantId: string, timeRange: string = "7d"): Promise<GrowthComparison> {
	const { startDate: currentStart, endDate: currentEnd } = getDateRange(timeRange)
	const { startDate: previousStart, endDate: previousEnd } = getPreviousDateRange(timeRange)

	const [currentOrders, previousOrders] = await Promise.all([
		prisma.order.findMany({
			where: {
				tenantId,
				createdAt: { gte: currentStart, lte: currentEnd },
				status: { not: "CANCELLED" },
			},
			select: { total: true, id: true, payments: { select: { status: true } } },
		}),
		prisma.order.findMany({
			where: {
				tenantId,
				createdAt: { gte: previousStart, lte: previousEnd },
				status: { not: "CANCELLED" },
			},
			select: { total: true, id: true, payments: { select: { status: true } } },
		}),
	])

	const currentRevenue = currentOrders.reduce((sum, order) => sum + order.total, 0)
	const currentOrderCount = currentOrders.length
	const currentAov = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0
	const currentCompleted = currentOrders.filter((o) => o.payments.some((p) => p.status === "COMPLETED")).length
	const currentConversion = currentOrderCount > 0 ? (currentCompleted / currentOrderCount) * 100 : 0

	const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total, 0)
	const previousOrderCount = previousOrders.length
	const previousAov = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0
	const previousCompleted = previousOrders.filter((o) => o.payments.some((p) => p.status === "COMPLETED")).length
	const previousConversion = previousOrderCount > 0 ? (previousCompleted / previousOrderCount) * 100 : 0

	const calculateGrowth = (current: number, previous: number): number => {
		if (previous === 0) return current > 0 ? 100 : 0
		return ((current - previous) / previous) * 100
	}

	return {
		revenueGrowth: calculateGrowth(currentRevenue, previousRevenue),
		ordersGrowth: calculateGrowth(currentOrderCount, previousOrderCount),
		aovGrowth: calculateGrowth(currentAov, previousAov),
		conversionGrowth: calculateGrowth(currentConversion, previousConversion),
		currentPeriod: {
			revenue: currentRevenue,
			orders: currentOrderCount,
			aov: currentAov,
			conversion: currentConversion,
		},
		previousPeriod: {
			revenue: previousRevenue,
			orders: previousOrderCount,
			aov: previousAov,
			conversion: previousConversion,
		},
	}
}

export async function getSalesData(tenantId: string, timeRange: string = "7d"): Promise<SalesData[]> {
	const { startDate, endDate } = getDateRange(timeRange)

	const orders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			status: {
				not: "CANCELLED",
			},
		},
		select: {
			total: true,
			createdAt: true,
			id: true,
		},
	})

	const periodMap = new Map<string, { period: string; revenue: number; orders: number }>()

	orders.forEach((order) => {
		const date = new Date(order.createdAt)
		let key: string
		let period: string

		if (timeRange === "7d" || timeRange === "30d") {
			key = date.toISOString().slice(0, 10)
			period = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
		} else {
			key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
			period = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
		}

		const existing = periodMap.get(key) || { period, revenue: 0, orders: 0 }
		periodMap.set(key, {
			period: existing.period,
			revenue: existing.revenue + order.total,
			orders: existing.orders + 1,
		})
	})

	return Array.from(periodMap.entries())
		.sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
		.map(([, data]) => ({
			period: data.period,
			revenue: data.revenue,
			orders: data.orders,
		}))
}

export async function getCategorySales(tenantId: string, timeRange: string = "7d"): Promise<CategorySales[]> {
	const { startDate, endDate } = getDateRange(timeRange)

	const orders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			status: {
				not: "CANCELLED",
			},
		},
		include: {
			items: {
				where: { tenantId },
				include: {
					product: {
						include: {
							category: true,
						},
					},
				},
			},
		},
	})

	const categoryMap = new Map<string, number>()

	orders.forEach((order) => {
		order.items.forEach((item) => {
			const categoryName = item.product.category.name
			const existing = categoryMap.get(categoryName) || 0
			categoryMap.set(categoryName, existing + item.price * item.quantity)
		})
	})

	const totalSales = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0)

	return Array.from(categoryMap.entries())
		.map(([category, sales]) => ({
			category,
			sales,
			percentage: totalSales > 0 ? (sales / totalSales) * 100 : 0,
		}))
		.sort((a, b) => b.sales - a.sales)
}

export async function getTopProducts(tenantId: string, timeRange: string = "7d", limit: number = 5): Promise<TopProduct[]> {
	const { startDate, endDate } = getDateRange(timeRange)

	const orders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			status: {
				not: "CANCELLED",
			},
		},
		include: {
			items: {
				where: { tenantId },
				include: {
					product: {
						include: {
							category: true,
						},
					},
				},
			},
		},
	})

	const productMap = new Map<string, { sales: number; revenue: number; product: any }>()

	orders.forEach((order) => {
		order.items.forEach((item) => {
			const existing = productMap.get(item.productId) || { sales: 0, revenue: 0, product: item.product }
			productMap.set(item.productId, {
				sales: existing.sales + item.quantity,
				revenue: existing.revenue + item.price * item.quantity,
				product: item.product,
			})
		})
	})

	// Calculate growth by comparing to previous period
	const { startDate: previousStart, endDate: previousEnd } = getPreviousDateRange(timeRange)
	const previousOrders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: { gte: previousStart, lte: previousEnd },
			status: { not: "CANCELLED" },
		},
		include: {
			items: {
				where: { tenantId },
				include: {
					product: true,
				},
			},
		},
	})

	const previousProductMap = new Map<string, { revenue: number }>()
	previousOrders.forEach((order) => {
		order.items.forEach((item) => {
			const existing = previousProductMap.get(item.productId) || { revenue: 0 }
			previousProductMap.set(item.productId, {
				revenue: existing.revenue + item.price * item.quantity,
			})
		})
	})

	return Array.from(productMap.values())
		.map((data) => {
			const previousRevenue = previousProductMap.get(data.product.id)?.revenue || 0
			const currentRevenue = data.revenue
			const growth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? 100 : 0

			return {
				id: data.product.id,
				name: data.product.name,
				category: data.product.category.name,
				sales: data.sales,
				revenue: data.revenue,
				image: data.product.images[0] || "/placeholder-product.jpg",
				growth: Math.round(growth),
			}
		})
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, limit)
}

export async function getRegionSales(tenantId: string, timeRange: string = "7d"): Promise<RegionSales[]> {
	const { startDate, endDate } = getDateRange(timeRange)

	const orders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			status: {
				not: "CANCELLED",
			},
		},
		select: {
			total: true,
			shippingAddress: true,
			id: true,
		},
	})

	const regionMap = new Map<string, { sales: number; orders: number }>()

	orders.forEach((order) => {
		const shippingAddress = order.shippingAddress && typeof order.shippingAddress === "object" && !Array.isArray(order.shippingAddress) ? order.shippingAddress as Record<string, unknown> : {}
		const county = typeof shippingAddress.county === "string" && shippingAddress.county.trim() ? shippingAddress.county.trim() : "Other"
		const existing = regionMap.get(county) || { sales: 0, orders: 0 }
		regionMap.set(county, {
			sales: existing.sales + order.total,
			orders: existing.orders + 1,
		})
	})

	return Array.from(regionMap.entries())
		.map(([region, data]) => ({
			region,
			sales: data.sales,
			orders: data.orders,
		}))
		.sort((a, b) => b.sales - a.sales)
}

export async function getPaymentMethodStats(tenantId: string, timeRange: string = "7d"): Promise<PaymentMethodStats[]> {
	const { startDate, endDate } = getDateRange(timeRange)

	const orders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			status: {
				not: "CANCELLED",
			},
			paymentMethod: {
				not: null,
			},
		},
		select: {
			total: true,
			paymentMethod: true,
			id: true,
		},
	})

	const methodMap = new Map<string, { amount: number; orders: number }>()

	orders.forEach((order) => {
		const method = order.paymentMethod || "Unknown"
		const existing = methodMap.get(method) || { amount: 0, orders: 0 }
		methodMap.set(method, {
			amount: existing.amount + order.total,
			orders: existing.orders + 1,
		})
	})

	const totalAmount = Array.from(methodMap.values()).reduce((sum, val) => sum + val.amount, 0)

	return Array.from(methodMap.entries())
		.map(([method, data]) => ({
			method,
			percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
			amount: data.amount,
			orders: data.orders,
		}))
		.sort((a, b) => b.amount - a.amount)
}

export async function getAnalyticsExport(tenantId: string, timeRange: string = "7d", format: "csv" | "json" = "csv") {
	const [overview, salesData, categorySales, topProducts, regionSales, paymentMethods, growth] =
		await Promise.all([
			getAnalyticsOverview(tenantId, timeRange),
			getSalesData(tenantId, timeRange),
			getCategorySales(tenantId, timeRange),
			getTopProducts(tenantId, timeRange, 10),
			getRegionSales(tenantId, timeRange),
			getPaymentMethodStats(tenantId, timeRange),
			getGrowthComparison(tenantId, timeRange),
		])

	if (format === "json") {
		return {
			overview,
			salesData,
			categorySales,
			topProducts,
			regionSales,
			paymentMethods,
			growth,
			exportedAt: new Date().toISOString(),
		}
	}

	// CSV format
	const csvRows: string[] = []
	csvRows.push("Nurava Tech Analytics Export")
	csvRows.push(`Time Range: ${timeRange}`)
	csvRows.push(`Exported At: ${new Date().toISOString()}`)
	csvRows.push("")

	csvRows.push("OVERVIEW")
	csvRows.push(`Total Revenue,${overview.totalRevenue}`)
	csvRows.push(`Total Orders,${overview.totalOrders}`)
	csvRows.push(`Average Order Value,${Math.round(overview.averageOrderValue)}`)
	csvRows.push(`Conversion Rate,${overview.conversionRate.toFixed(2)}%`)
	csvRows.push("")

	csvRows.push("GROWTH COMPARISON")
	csvRows.push(`Revenue Growth,${growth.revenueGrowth.toFixed(2)}%`)
	csvRows.push(`Orders Growth,${growth.ordersGrowth.toFixed(2)}%`)
	csvRows.push(`AOV Growth,${growth.aovGrowth.toFixed(2)}%`)
	csvRows.push(`Conversion Growth,${growth.conversionGrowth.toFixed(2)}%`)
	csvRows.push("")

	csvRows.push("SALES DATA")
	csvRows.push("Period,Revenue,Orders")
	salesData.forEach((item) => {
		csvRows.push(`${item.period},${item.revenue},${item.orders}`)
	})
	csvRows.push("")

	csvRows.push("CATEGORY SALES")
	csvRows.push("Category,Sales,Percentage")
	categorySales.forEach((item) => {
		csvRows.push(`${item.category},${item.sales},${item.percentage.toFixed(2)}%`)
	})
	csvRows.push("")

	csvRows.push("TOP PRODUCTS")
	csvRows.push("Name,Category,Sales,Revenue,Growth %")
	topProducts.forEach((item) => {
		csvRows.push(`${item.name},${item.category},${item.sales},${item.revenue},${item.growth}%`)
	})
	csvRows.push("")

	csvRows.push("REGION SALES")
	csvRows.push("Region,Sales,Orders")
	regionSales.forEach((item) => {
		csvRows.push(`${item.region},${item.sales},${item.orders}`)
	})
	csvRows.push("")

	csvRows.push("PAYMENT METHODS")
	csvRows.push("Method,Amount,Orders,Percentage")
	paymentMethods.forEach((item) => {
		csvRows.push(`${item.method},${item.amount},${item.orders},${item.percentage.toFixed(2)}%`)
	})

	return csvRows.join("\n")
}
