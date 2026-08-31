import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { apiErrorResponse } from "backend/lib/api-handler"

const planSchema = z.object({ action: z.literal("plan"), key: z.string().regex(/^[A-Z0-9_-]+$/), name: z.string().min(2).max(80), price: z.number().int().nonnegative().nullable(), currency: z.string().length(3).default("KES"), billingInterval: z.enum(["MONTH", "YEAR"]).nullable(), setupFeeAmount: z.number().int().nonnegative().default(0), transactionFeePercent: z.number().min(0).max(100).default(0), stripePriceId: z.string().min(3).nullable().optional(), active: z.boolean().default(true), entitlementsJson: z.record(z.unknown()).optional() })
const addonSchema = z.object({ action: z.literal("addon"), key: z.string().regex(/^[a-z0-9_-]+$/), name: z.string().min(2).max(80), description: z.string().max(500).nullable().optional(), price: z.number().int().positive(), currency: z.string().length(3).default("KES"), billingInterval: z.enum(["MONTH", "YEAR"]).default("MONTH"), stripePriceId: z.string().min(3).nullable().optional(), active: z.boolean().default(true) })
const actionSchema = z.union([planSchema, addonSchema])

async function requirePlatformApi() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	const allowed = session.user.role === "SUPERADMIN" || ["PLATFORM_OWNER", "PLATFORM_ADMIN"].includes(session.user.platformRole || "")
	if (!allowed) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	return { session }
}

export async function GET() {
	const access = await requirePlatformApi()
	if (access.response) return access.response
	try {
		const [plans, addons, subscriptionCount, activeSubscriptionCount, invoices, failedPayments, customers] = await Promise.all([
			prisma.plan.findMany({ orderBy: [{ active: "desc" }, { price: "asc" }] }),
			prisma.addon.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
			prisma.subscription.count(),
			prisma.subscription.count({ where: { status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE_PERIOD"] } } }),
			prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { tenant: { select: { id: true, legalName: true } }, subscription: { select: { status: true } } } }),
			prisma.payment.findMany({ where: { kind: { not: "ORDER" }, status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, tenantId: true, provider: true, amount: true, currency: true, failureReason: true, createdAt: true } }),
			prisma.billingCustomer.findMany({ select: { tenantId: true, stripeCustomerId: true, mpesaPhone: true, tenant: { select: { legalName: true, status: true } } } }),
		])
		const revenue = await prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { total: true } })
		const commission = await prisma.transaction.aggregate({ where: { status: "COMPLETED" }, _sum: { commissionAmount: true } })
		return NextResponse.json({ plans, addons, stats: { subscriptionCount, activeSubscriptionCount, paidRevenue: revenue._sum.total || 0, generatedCommission: commission._sum.commissionAmount || 0 }, invoices, failedPayments, customers })
	} catch (error) {
		console.error("Platform billing unavailable", error)
		return NextResponse.json({ message: "Platform billing unavailable" }, { status: 503 })
	}
}

export async function POST(request: NextRequest) {
	const access = await requirePlatformApi()
	if (access.response) return access.response
	try {
		const parsed = actionSchema.safeParse(await request.json())
		if (!parsed.success) return NextResponse.json({ message: "Invalid platform billing action", issues: parsed.error.flatten() }, { status: 400 })
		if (parsed.data.action === "plan") {
			const plan = await prisma.plan.upsert({ where: { key: parsed.data.key }, update: { name: parsed.data.name, price: parsed.data.price, currency: parsed.data.currency.toUpperCase(), billingInterval: parsed.data.billingInterval, setupFeeAmount: parsed.data.setupFeeAmount, transactionFeePercent: parsed.data.transactionFeePercent, stripePriceId: parsed.data.stripePriceId, active: parsed.data.active, entitlementsJson: parsed.data.entitlementsJson as any }, create: { key: parsed.data.key, name: parsed.data.name, price: parsed.data.price, currency: parsed.data.currency.toUpperCase(), billingInterval: parsed.data.billingInterval, setupFeeAmount: parsed.data.setupFeeAmount, transactionFeePercent: parsed.data.transactionFeePercent, stripePriceId: parsed.data.stripePriceId, active: parsed.data.active, entitlementsJson: parsed.data.entitlementsJson as any } })
			return NextResponse.json({ plan }, { status: 201 })
		}
		const addon = await prisma.addon.upsert({ where: { key: parsed.data.key }, update: { name: parsed.data.name, description: parsed.data.description, price: parsed.data.price, currency: parsed.data.currency.toUpperCase(), billingInterval: parsed.data.billingInterval, stripePriceId: parsed.data.stripePriceId, active: parsed.data.active }, create: { key: parsed.data.key, name: parsed.data.name, description: parsed.data.description, price: parsed.data.price, currency: parsed.data.currency.toUpperCase(), billingInterval: parsed.data.billingInterval, stripePriceId: parsed.data.stripePriceId, active: parsed.data.active } })
		return NextResponse.json({ addon }, { status: 201 })
	} catch (error: any) {
		console.error("Platform billing mutation failed", error)
		return apiErrorResponse(error, "Unable to save billing configuration")
	}
}
