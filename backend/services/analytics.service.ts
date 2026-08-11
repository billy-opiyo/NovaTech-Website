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

export async function getAnalyticsOverview(timeRange: string = "7d"): Promise<AnalyticsOverview> {
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

	const orders = await prisma.order.findMany({
		where: {
			createdAt: {
				gte: startDate,
				lte: now,
			},
			status: {
				not: "CANCELLED",
			},
		},
		select: {
			total: true,
			id: true,
			items: {
				select: {
					productId: true,
				},
			},
		},
	})

	const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
	const totalOrders = orders.length
	const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

	// Calculate conversion rate (orders with completed payments / total orders)
	const completedOrders = await prisma.order.count({
		where: {
			createdAt: {
				gte: startDate,
				lte: now,
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

export async function getSalesData(timeRange: string = "7d"): Promise<SalesData[]> {
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

	const orders = await prisma.order.findMany({
		where: {
			createdAt: {
				gte: startDate,
				lte: now,
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

	// Group by period (day for 7d/30d, month for 3m/1y)
	const periodMap = new Map<string, { revenue: number; orders: number }>()

	orders.forEach((order) => {
		const date = new Date(order.createdAt)
		let period: string

		if (timeRange === "7d" || timeRange === "30d") {
			period = date.toLocaleDateString("en-US", { weekday: "short" })
		} else {
			period = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
		}

		const existing = periodMap.get(period) || { revenue: 0, orders: 0 }
		periodMap.set(period, {
			revenue: existing.revenue + order.total,
			orders: existing.orders + 1,
		})
	})

	return Array.from(periodMap.entries())
		.map(([period, data]) => ({
			period,
			revenue: data.revenue,
			orders: data.orders,
		}))
		.sort((a, b) => {
			const dateA = new Date(a.period)
			const dateB = new Date(b.period)
			return dateA.getTime() - dateB.getTime()
		})
}

export async function getCategorySales(timeRange: string = "7d"): Promise<CategorySales[]> {
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

	const orders = await prisma.order.findMany({
		where: {
			createdAt: {
				gte: startDate,
				lte: now,
			},
			status: {
				not: "CANCELLED",
			},
		},
		include: {
			items: {
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

export async function getTopProducts(timeRange: string = "7d", limit: number = 5): Promise<TopProduct[]> {
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

	const orders = await prisma.order.findMany({
		where: {
			createdAt: {
				gte: startDate,
				lte: now,
			},
			status: {
				not: "CANCELLED",
			},
		},
		include: {
			items: {
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

	return Array.from(productMap.values())
		.map((data) => ({
			id: data.product.id,
			name: data.product.name,
			category: data.product.category.name,
			sales: data.sales,
			revenue: data.revenue,
			image: data.product.images[0] || "/placeholder-product.jpg",
			growth: 0, // Would need previous period data to calculate
		}))
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, limit)
}

export async function getRegionSales(timeRange: string = "7d"): Promise<RegionSales[]> {
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

	const orders = await prisma.order.findMany({
		where: {
			createdAt: {
				gte: startDate,
				lte: now,
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
		const county = (order.shippingAddress as any).county || "Other"
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

export async function getPaymentMethodStats(timeRange: string = "7d"): Promise<PaymentMethodStats[]> {
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

	const orders = await prisma.order.findMany({
		where: {
			createdAt: {
				gte: startDate,
				lte: now,
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