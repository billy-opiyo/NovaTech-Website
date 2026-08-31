import { Prisma } from "@prisma/client"
import prisma from "../lib/db"

export function csvCell(value: string | number) {
	const text = String(value)
	const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
	return `"${safe.replace(/"/g, '""')}"`
}

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
	slug: string
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

type SettledOrderAggregate = {
	revenue: number
	orders: number
}

async function getSettledOrderAggregate(
	tenantId: string,
	startDate: Date,
	endDate: Date,
): Promise<SettledOrderAggregate> {
	const aggregate = await prisma.order.aggregate({
		where: {
			tenantId,
			createdAt: { gte: startDate, lte: endDate },
			status: { not: "CANCELLED" },
			payments: { some: { status: "COMPLETED" } },
		},
		_sum: { total: true },
		_count: { _all: true },
	})

	return {
		revenue: aggregate._sum.total ?? 0,
		orders: aggregate._count._all,
	}
}

export async function getAnalyticsOverview(tenantId: string, timeRange: string = "7d"): Promise<AnalyticsOverview> {
	const { startDate, endDate } = getDateRange(timeRange)
	const aggregate = await getSettledOrderAggregate(tenantId, startDate, endDate)
	const totalRevenue = aggregate.revenue
	const totalOrders = aggregate.orders
	const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
	const conversionRate = totalOrders > 0 ? 100 : 0

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

	const [current, previous] = await Promise.all([
		getSettledOrderAggregate(tenantId, currentStart, currentEnd),
		getSettledOrderAggregate(tenantId, previousStart, previousEnd),
	])

	const currentRevenue = current.revenue
	const currentOrderCount = current.orders
	const currentAov = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0
	const currentConversion = currentOrderCount > 0 ? 100 : 0

	const previousRevenue = previous.revenue
	const previousOrderCount = previous.orders
	const previousAov = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0
	const previousConversion = previousOrderCount > 0 ? 100 : 0

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
	const bucketExpression = timeRange === "7d" || timeRange === "30d"
		? Prisma.sql`date_trunc('day', o."createdAt")`
		: Prisma.sql`date_trunc('month', o."createdAt")`
	const rows = await prisma.$queryRaw<Array<{ bucket: Date; revenue: number; orders: number }>>(Prisma.sql`
		SELECT ${bucketExpression} AS bucket,
			COALESCE(SUM(o."total"), 0)::float8 AS revenue,
			COUNT(*)::int AS orders
		FROM "Order" o
		WHERE o."tenantId" = ${tenantId}
			AND o."createdAt" >= ${startDate}
			AND o."createdAt" <= ${endDate}
			AND o."status" <> 'CANCELLED'
			AND EXISTS (
				SELECT 1 FROM "Payment" p
				WHERE p."orderId" = o."id" AND p."status" = 'COMPLETED'
			)
		GROUP BY 1
		ORDER BY 1 ASC
	`)

	return rows.map((row) => {
		const date = new Date(row.bucket)
		return {
			period: timeRange === "7d" || timeRange === "30d"
				? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
				: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
			revenue: Number(row.revenue),
			orders: Number(row.orders),
		}
	})
}

export async function getCategorySales(tenantId: string, timeRange: string = "7d"): Promise<CategorySales[]> {
	const { startDate, endDate } = getDateRange(timeRange)
	const rows = await prisma.$queryRaw<Array<{ category: string; sales: number }>>(Prisma.sql`
		SELECT c."name" AS category,
			COALESCE(SUM(oi."price" * oi."quantity"), 0)::float8 AS sales
		FROM "OrderItem" oi
		JOIN "Order" o ON o."id" = oi."orderId"
		JOIN "Product" p ON p."id" = oi."productId" AND p."tenantId" = ${tenantId}
		JOIN "Category" c ON c."id" = p."categoryId"
		WHERE o."tenantId" = ${tenantId}
			AND oi."tenantId" = ${tenantId}
			AND o."createdAt" >= ${startDate}
			AND o."createdAt" <= ${endDate}
			AND o."status" <> 'CANCELLED'
			AND EXISTS (
				SELECT 1 FROM "Payment" payment
				WHERE payment."orderId" = o."id" AND payment."status" = 'COMPLETED'
			)
		GROUP BY c."name"
		ORDER BY sales DESC
	`)
	const totalSales = rows.reduce((sum, row) => sum + Number(row.sales), 0)
	return rows.map((row) => {
		const sales = Number(row.sales)
		return { category: row.category, sales, percentage: totalSales > 0 ? (sales / totalSales) * 100 : 0 }
	})
}

export async function getTopProducts(tenantId: string, timeRange: string = "7d", limit: number = 5): Promise<TopProduct[]> {
	const { startDate, endDate } = getDateRange(timeRange)
	const { startDate: previousStart, endDate: previousEnd } = getPreviousDateRange(timeRange)
	const safeLimit = Math.max(0, Math.min(Math.floor(limit), 100))
	const [currentRows, previousRows] = await Promise.all([
		prisma.$queryRaw<Array<{ id: string; slug: string; name: string; category: string; sales: number; revenue: number; image: string | null }>>(Prisma.sql`
			SELECT p."id", p."slug", p."name", c."name" AS category,
				COALESCE(SUM(oi."quantity"), 0)::int AS sales,
				COALESCE(SUM(oi."price" * oi."quantity"), 0)::float8 AS revenue,
				p."images"[1] AS image
			FROM "OrderItem" oi
			JOIN "Order" o ON o."id" = oi."orderId"
			JOIN "Product" p ON p."id" = oi."productId" AND p."tenantId" = ${tenantId}
			JOIN "Category" c ON c."id" = p."categoryId"
			WHERE o."tenantId" = ${tenantId}
				AND oi."tenantId" = ${tenantId}
				AND o."createdAt" >= ${startDate}
				AND o."createdAt" <= ${endDate}
				AND o."status" <> 'CANCELLED'
				AND EXISTS (
					SELECT 1 FROM "Payment" payment
					WHERE payment."orderId" = o."id" AND payment."status" = 'COMPLETED'
				)
			GROUP BY p."id", p."slug", p."name", c."name", p."images"
			ORDER BY revenue DESC
			LIMIT ${safeLimit}
		`),
		prisma.$queryRaw<Array<{ id: string; revenue: number }>>(Prisma.sql`
			SELECT oi."productId" AS id,
				COALESCE(SUM(oi."price" * oi."quantity"), 0)::float8 AS revenue
			FROM "OrderItem" oi
			JOIN "Order" o ON o."id" = oi."orderId"
			JOIN "Product" p ON p."id" = oi."productId" AND p."tenantId" = ${tenantId}
			WHERE o."tenantId" = ${tenantId}
				AND oi."tenantId" = ${tenantId}
				AND o."createdAt" >= ${previousStart}
				AND o."createdAt" <= ${previousEnd}
				AND o."status" <> 'CANCELLED'
				AND EXISTS (
					SELECT 1 FROM "Payment" payment
					WHERE payment."orderId" = o."id" AND payment."status" = 'COMPLETED'
				)
			GROUP BY oi."productId"
			`),
	])

	const previousRevenueByProduct = new Map(previousRows.map((row) => [row.id, Number(row.revenue)]))
	return currentRows.map((row) => {
		const revenue = Number(row.revenue)
		const previousRevenue = previousRevenueByProduct.get(row.id) || 0
		const growth = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : revenue > 0 ? 100 : 0
		return {
			id: row.id,
			slug: row.slug,
			name: row.name,
			category: row.category,
			sales: Number(row.sales),
			revenue,
			image: row.image || "/placeholder-product.jpg",
			growth: Math.round(growth),
		}
	})
}

export async function getRegionSales(tenantId: string, timeRange: string = "7d"): Promise<RegionSales[]> {
	const { startDate, endDate } = getDateRange(timeRange)
	const rows = await prisma.$queryRaw<Array<{ region: string; sales: number; orders: number }>>(Prisma.sql`
		SELECT COALESCE(NULLIF(BTRIM(o."shippingAddress" ->> 'county'), ''), 'Other') AS region,
			COALESCE(SUM(o."total"), 0)::float8 AS sales,
			COUNT(*)::int AS orders
		FROM "Order" o
		WHERE o."tenantId" = ${tenantId}
			AND o."createdAt" >= ${startDate}
			AND o."createdAt" <= ${endDate}
			AND o."status" <> 'CANCELLED'
			AND EXISTS (
				SELECT 1 FROM "Payment" p
				WHERE p."orderId" = o."id" AND p."status" = 'COMPLETED'
			)
		GROUP BY 1
		ORDER BY sales DESC
	`)
	return rows.map((row) => ({ region: row.region, sales: Number(row.sales), orders: Number(row.orders) }))
}

export async function getPaymentMethodStats(tenantId: string, timeRange: string = "7d"): Promise<PaymentMethodStats[]> {
	const { startDate, endDate } = getDateRange(timeRange)
	const rows = await prisma.$queryRaw<Array<{ method: string; amount: number; orders: number }>>(Prisma.sql`
		SELECT COALESCE(o."paymentMethod", 'Unknown') AS method,
			COALESCE(SUM(o."total"), 0)::float8 AS amount,
			COUNT(*)::int AS orders
		FROM "Order" o
		WHERE o."tenantId" = ${tenantId}
			AND o."createdAt" >= ${startDate}
			AND o."createdAt" <= ${endDate}
			AND o."status" <> 'CANCELLED'
			AND o."paymentMethod" IS NOT NULL
			AND EXISTS (
				SELECT 1 FROM "Payment" p
				WHERE p."orderId" = o."id" AND p."status" = 'COMPLETED'
			)
		GROUP BY 1
		ORDER BY amount DESC
	`)
	const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount), 0)
	return rows.map((row) => {
		const amount = Number(row.amount)
		return { method: row.method, percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0, amount, orders: Number(row.orders) }
	})
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
	csvRows.push(`${csvCell("Time Range")},${csvCell(timeRange)}`)
	csvRows.push(`${csvCell("Exported At")},${csvCell(new Date().toISOString())}`)
	csvRows.push("")

	csvRows.push("OVERVIEW")
	csvRows.push(`${csvCell("Total Revenue")},${csvCell(overview.totalRevenue)}`)
	csvRows.push(`${csvCell("Total Orders")},${csvCell(overview.totalOrders)}`)
	csvRows.push(`${csvCell("Average Order Value")},${csvCell(Math.round(overview.averageOrderValue))}`)
	csvRows.push(`${csvCell("Conversion Rate")},${csvCell(`${overview.conversionRate.toFixed(2)}%`)}`)
	csvRows.push("")

	csvRows.push("GROWTH COMPARISON")
	csvRows.push(`${csvCell("Revenue Growth")},${csvCell(`${growth.revenueGrowth.toFixed(2)}%`)}`)
	csvRows.push(`${csvCell("Orders Growth")},${csvCell(`${growth.ordersGrowth.toFixed(2)}%`)}`)
	csvRows.push(`${csvCell("AOV Growth")},${csvCell(`${growth.aovGrowth.toFixed(2)}%`)}`)
	csvRows.push(`${csvCell("Conversion Growth")},${csvCell(`${growth.conversionGrowth.toFixed(2)}%`)}`)
	csvRows.push("")

	csvRows.push("SALES DATA")
	csvRows.push("Period,Revenue,Orders")
	salesData.forEach((item) => {
		csvRows.push([item.period, item.revenue, item.orders].map(csvCell).join(","))
	})
	csvRows.push("")

	csvRows.push("CATEGORY SALES")
	csvRows.push("Category,Sales,Percentage")
	categorySales.forEach((item) => {
		csvRows.push([item.category, item.sales, `${item.percentage.toFixed(2)}%`].map(csvCell).join(","))
	})
	csvRows.push("")

	csvRows.push("TOP PRODUCTS")
	csvRows.push("Name,Category,Sales,Revenue,Growth %")
	topProducts.forEach((item) => {
		csvRows.push([item.name, item.category, item.sales, item.revenue, `${item.growth}%`].map(csvCell).join(","))
	})
	csvRows.push("")

	csvRows.push("REGION SALES")
	csvRows.push("Region,Sales,Orders")
	regionSales.forEach((item) => {
		csvRows.push([item.region, item.sales, item.orders].map(csvCell).join(","))
	})
	csvRows.push("")

	csvRows.push("PAYMENT METHODS")
	csvRows.push("Method,Amount,Orders,Percentage")
	paymentMethods.forEach((item) => {
		csvRows.push([item.method, item.amount, item.orders, `${item.percentage.toFixed(2)}%`].map(csvCell).join(","))
	})

	return csvRows.join("\n")
}
