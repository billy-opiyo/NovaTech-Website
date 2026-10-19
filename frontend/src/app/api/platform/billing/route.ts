import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { apiErrorResponse } from "backend/lib/api-handler"
import { Prisma } from "@prisma/client"
import { createActionRecord } from "backend/actions"
import { encryptMerchantPaymentDetails } from "backend/lib/merchant-verification-secrets"
import { getPlatformMpesaDestinationSummaries, getPlatformMpesaDestinationSummary, validatePlatformMpesaDestination, type PlatformMpesaAccountType } from "backend/lib/platform-mpesa-destination"
import { reviewManualBillingPayment } from "backend/billing/service"

const planSchema = z.object({ action: z.literal("plan"), key: z.string().regex(/^[A-Z0-9_-]+$/), name: z.string().min(2).max(80), price: z.number().int().nonnegative().nullable(), currency: z.string().length(3).default("KES").refine((value) => value.toUpperCase() === "KES", "Platform billing currently supports KES only"), billingInterval: z.enum(["MONTH", "YEAR"]).nullable(), setupFeeAmount: z.number().int().nonnegative().default(0), transactionFeePercent: z.number().min(0).max(100).default(0), stripePriceId: z.string().min(3).nullable().optional(), active: z.boolean().default(true), entitlementsJson: z.record(z.unknown()).optional() })
const addonSchema = z.object({ action: z.literal("addon"), key: z.string().regex(/^[a-z0-9_-]+$/), name: z.string().min(2).max(80), description: z.string().max(500).nullable().optional(), price: z.number().int().positive(), currency: z.string().length(3).default("KES").refine((value) => value.toUpperCase() === "KES", "Platform billing currently supports KES only"), billingInterval: z.enum(["MONTH", "YEAR"]).default("MONTH"), stripePriceId: z.string().min(3).nullable().optional(), active: z.boolean().default(true) })
const destinationSchema = z.object({ action: z.literal("mpesa_destination"), accountType: z.enum(["PAYBILL", "TILL", "PHONE"]), accountNumber: z.string().min(5).max(15), passkey: z.string().min(1).max(256).optional() })
const disableDestinationSchema = z.object({ action: z.literal("disable_mpesa_destination"), accountType: z.enum(["PAYBILL", "TILL", "PHONE"]) })
const reviewManualSchema = z.object({ action: z.literal("review_manual_payment"), paymentId: z.string().min(1), approve: z.boolean(), note: z.string().max(500).optional() })
const actionSchema = z.union([planSchema, addonSchema, destinationSchema, disableDestinationSchema, reviewManualSchema])

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
		const [plans, addons, subscriptionCount, activeSubscriptionCount, invoices, failedPayments, customers, manualPayments, paymentDestination, paymentDestinations] = await Promise.all([
			prisma.plan.findMany({ orderBy: [{ active: "desc" }, { price: "asc" }] }),
			prisma.addon.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
			prisma.subscription.count(),
			prisma.subscription.count({ where: { status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE_PERIOD"] } } }),
			prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { tenant: { select: { id: true, legalName: true } }, subscription: { select: { status: true } } } }),
			prisma.payment.findMany({ where: { kind: { not: "ORDER" }, status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, tenantId: true, provider: true, amount: true, currency: true, failureReason: true, createdAt: true } }),
			prisma.billingCustomer.findMany({ select: { tenantId: true, stripeCustomerId: true, mpesaPhone: true, tenant: { select: { legalName: true, status: true } } } }),
			prisma.payment.findMany({ where: { provider: "mpesa-manual", status: "PROCESSING" }, orderBy: { createdAt: "asc" }, take: 100, select: { id: true, tenantId: true, amount: true, currency: true, kind: true, providerReference: true, phoneNumber: true, metadata: true, createdAt: true, tenant: { select: { legalName: true } }, invoice: { select: { kind: true, status: true } } } }),
			getPlatformMpesaDestinationSummary(),
			getPlatformMpesaDestinationSummaries(),
		])
		const revenue = await prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { total: true } })
		const commission = await prisma.transaction.aggregate({ where: { status: "COMPLETED" }, _sum: { commissionAmount: true } })
		const canManageCollection = access.session.user.role === "SUPERADMIN" || access.session.user.platformRole === "PLATFORM_OWNER"
		return NextResponse.json({ plans, addons, stats: { subscriptionCount, activeSubscriptionCount, paidRevenue: revenue._sum.total || 0, generatedCommission: commission._sum.commissionAmount || 0 }, invoices, failedPayments, customers, manualPayments, paymentDestination, paymentDestinations, canManageCollection })
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
		if (["mpesa_destination", "disable_mpesa_destination", "review_manual_payment"].includes(parsed.data.action) && access.session.user.role !== "SUPERADMIN" && access.session.user.platformRole !== "PLATFORM_OWNER") return NextResponse.json({ message: "Platform owner access required for collection settings and manual receipt verification" }, { status: 403 })
		if (parsed.data.action === "mpesa_destination") {
			const accountType: PlatformMpesaAccountType = parsed.data.accountType
			const accountNumber = parsed.data.accountNumber.replace(/\D/g, "")
			if (!validatePlatformMpesaDestination(accountType, accountNumber)) return NextResponse.json({ message: accountType === "PHONE" ? "Enter a valid Kenyan M-Pesa phone number." : "Enter a valid PayBill or Till short code." }, { status: 400 })
			const current = await prisma.platformMpesaDestination.findFirst({ where: { accountType, isActive: true }, orderBy: { version: "desc" } })
			const passkey = parsed.data.passkey?.trim()
			let passkeyCiphertext: string | null = null
			if (accountType !== "PHONE") {
				if (passkey) {
					try { passkeyCiphertext = encryptMerchantPaymentDetails({ passkey }) }
					catch { return NextResponse.json({ message: "Server-side credential encryption is not configured; the passkey was not saved." }, { status: 503 }) }
				}
				else if (current?.accountType === accountType && current.accountNumber === accountNumber && current.passkeyCiphertext) passkeyCiphertext = current.passkeyCiphertext
				else if (accountNumber === process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY) passkeyCiphertext = null
				else return NextResponse.json({ message: "Enter the Daraja passkey for this PayBill or Till. It is stored encrypted and is never returned by the API." }, { status: 400 })
			}
			const destination = await prisma.$transaction(async (transaction) => {
				await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('platform-mpesa-destination'))`
				const latest = await transaction.platformMpesaDestination.findFirst({ orderBy: { version: "desc" }, select: { version: true } })
				await transaction.platformMpesaDestination.updateMany({ where: { accountType, isActive: true }, data: { isActive: false } })
				return transaction.platformMpesaDestination.create({ data: { version: (latest?.version || 0) + 1, accountType, accountNumber, passkeyCiphertext, isActive: true, createdById: access.session.user.id } })
			})
			await createActionRecord("UPDATED_PLATFORM_MPESA_DESTINATION", { adminId: access.session.user.id, accountType, accountNumber }).catch(() => undefined)
			const summary = await getPlatformMpesaDestinationSummary(destination.version)
			return NextResponse.json({ paymentDestination: summary, savedVersion: destination.version })
		}
		if (parsed.data.action === "disable_mpesa_destination") {
			const accountType: PlatformMpesaAccountType = parsed.data.accountType
			const fallbackOption = (await getPlatformMpesaDestinationSummaries()).find((item) => item.source === "ENVIRONMENT" && item.accountType === accountType)
			const disabledCount = await prisma.$transaction(async (transaction) => {
				await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('platform-mpesa-destination'))`
				const disabled = await transaction.platformMpesaDestination.updateMany({ where: { accountType, isActive: true }, data: { isActive: false } })
				if (disabled.count) return disabled.count
				if (!fallbackOption || await transaction.platformMpesaDestination.findFirst({ where: { accountType }, select: { id: true } })) return 0
				const latest = await transaction.platformMpesaDestination.findFirst({ orderBy: { version: "desc" }, select: { version: true } })
				await transaction.platformMpesaDestination.create({ data: { version: (latest?.version || 0) + 1, accountType, accountNumber: fallbackOption.accountNumber, isActive: false, createdById: access.session.user.id } })
				return 1
			})
			if (!disabledCount) return NextResponse.json({ message: "That M-Pesa payment option is not currently enabled." }, { status: 404 })
			await createActionRecord("DISABLED_PLATFORM_MPESA_DESTINATION", { adminId: access.session.user.id, accountType }).catch(() => undefined)
			return NextResponse.json({ paymentDestinations: await getPlatformMpesaDestinationSummaries() })
		}
		if (parsed.data.action === "review_manual_payment") {
			const result = await reviewManualBillingPayment({ paymentId: parsed.data.paymentId, reviewerId: access.session.user.id, approve: parsed.data.approve, note: parsed.data.note })
			await createActionRecord(parsed.data.approve ? "VERIFIED_PLATFORM_MANUAL_MPESA_PAYMENT" : "REJECTED_PLATFORM_MANUAL_MPESA_PAYMENT", { adminId: access.session.user.id, paymentId: parsed.data.paymentId }).catch(() => undefined)
			return NextResponse.json(result)
		}
		if (parsed.data.action === "plan") {
			const entitlementsJson = parsed.data.entitlementsJson === undefined ? undefined : parsed.data.entitlementsJson as Prisma.InputJsonValue
			const plan = await prisma.plan.upsert({ where: { key: parsed.data.key }, update: { name: parsed.data.name, price: parsed.data.price, currency: parsed.data.currency.toUpperCase(), billingInterval: parsed.data.billingInterval, setupFeeAmount: parsed.data.setupFeeAmount, transactionFeePercent: parsed.data.transactionFeePercent, stripePriceId: parsed.data.stripePriceId, active: parsed.data.active, entitlementsJson }, create: { key: parsed.data.key, name: parsed.data.name, price: parsed.data.price, currency: parsed.data.currency.toUpperCase(), billingInterval: parsed.data.billingInterval, setupFeeAmount: parsed.data.setupFeeAmount, transactionFeePercent: parsed.data.transactionFeePercent, stripePriceId: parsed.data.stripePriceId, active: parsed.data.active, entitlementsJson } })
			return NextResponse.json({ plan }, { status: 201 })
		}
		const addon = await prisma.addon.upsert({ where: { key: parsed.data.key }, update: { name: parsed.data.name, description: parsed.data.description, price: parsed.data.price, currency: parsed.data.currency.toUpperCase(), billingInterval: parsed.data.billingInterval, stripePriceId: parsed.data.stripePriceId, active: parsed.data.active }, create: { key: parsed.data.key, name: parsed.data.name, description: parsed.data.description, price: parsed.data.price, currency: parsed.data.currency.toUpperCase(), billingInterval: parsed.data.billingInterval, stripePriceId: parsed.data.stripePriceId, active: parsed.data.active } })
		return NextResponse.json({ addon }, { status: 201 })
	} catch (error: unknown) {
		console.error("Platform billing mutation failed", error)
		return apiErrorResponse(error, "Unable to save billing configuration")
	}
}
