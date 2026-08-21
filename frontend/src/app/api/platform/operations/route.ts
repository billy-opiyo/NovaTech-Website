import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { getPlatformDomain } from "backend/lib/platform-domain"

const readRoles = new Set(["PLATFORM_OWNER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_ANALYST"])
const manageRoles = new Set(["PLATFORM_OWNER", "PLATFORM_ADMIN"])

async function requirePlatformApi(mutation = false) {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	const isSuperAdmin = session.user.role === "SUPERADMIN"
	const platformRole = session.user.platformRole || ""
	if (!isSuperAdmin && !readRoles.has(platformRole)) {
		return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	}
	if (mutation && !isSuperAdmin && !manageRoles.has(platformRole)) {
		return { response: NextResponse.json({ message: "Platform management access required" }, { status: 403 }) }
	}
	return { session }
}

function previewUrls(slug: string) {
	const domain = getPlatformDomain()
	return { local: `http://${slug}.localhost:3000`, production: `https://${slug}.${domain}` }
}

export async function GET(request: NextRequest) {
	const access = await requirePlatformApi()
	if (access.response) return access.response

	const search = request.nextUrl.searchParams.get("search")?.trim() || ""
	const status = request.nextUrl.searchParams.get("status") || "ALL"
	const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 50), 1), 100)

	try {
		const tenantWhere: any = { status: { not: "DELETED" } }
		if (["TRIALING", "ACTIVE", "PAST_DUE", "GRACE_PERIOD", "SUSPENDED", "CANCELLED"].includes(status)) tenantWhere.status = status
		if (search) {
			tenantWhere.OR = [
				{ legalName: { contains: search, mode: "insensitive" } },
				{ store: { is: { name: { contains: search, mode: "insensitive" } } } },
				{ store: { is: { slug: { contains: search, mode: "insensitive" } } } },
			]
		}

		const [
			totalTenants,
			activeTenants,
			trialingTenants,
			suspendedTenants,
			publishedStores,
			productCount,
			orderCount,
			customerCount,
			openTicketCount,
			activeSubscriptionCount,
			pendingSetupFees,
			revenue,
			tenants,
			activity,
			recentInvoices,
		] = await Promise.all([
			prisma.tenant.count({ where: tenantWhere }),
			prisma.tenant.count({ where: { status: "ACTIVE" } }),
			prisma.tenant.count({ where: { status: "TRIALING" } }),
			prisma.tenant.count({ where: { status: "SUSPENDED" } }),
			prisma.store.count({ where: { publicationStatus: "PUBLISHED" } }),
			prisma.product.count({ where: { tenantId: { not: null } } }),
			prisma.order.count({ where: { tenantId: { not: null } } }),
			prisma.user.count({ where: { role: "CUSTOMER" } }),
			prisma.supportTicket.count({ where: { tenantId: { not: null }, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] } } }),
			prisma.subscription.count({ where: { status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE_PERIOD"] } } }),
			prisma.billingRecord.count({ where: { setupFeeStatus: "PENDING", setupFeeAmount: { gt: 0 } } }),
			prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
			prisma.tenant.findMany({
				where: tenantWhere,
				orderBy: { updatedAt: "desc" },
				take: limit,
				select: {
					id: true,
					legalName: true,
					status: true,
					verificationStatus: true,
					verificationSubmittedAt: true,
					verificationReviewedAt: true,
					createdAt: true,
					updatedAt: true,
					suspendedAt: true,
					plan: { select: { key: true, name: true, price: true, currency: true, billingInterval: true, setupFeeAmount: true } },
					store: { select: { id: true, name: true, slug: true, publicationStatus: true, updatedAt: true, domains: { select: { hostname: true, verificationStatus: true, sslStatus: true, isCanonical: true } } } },
					billingRecord: { select: { setupFeeAmount: true, currency: true, setupFeeStatus: true, setupFeePaidAt: true } },
					subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, provider: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } },
					_count: { select: { products: true, orders: true, supportTickets: true, memberships: true } },
				},
			}),
			prisma.adminLog.findMany({
				where: { tenantId: { not: null } },
				orderBy: { createdAt: "desc" },
				take: 25,
				select: { id: true, action: true, details: true, createdAt: true, admin: { select: { name: true, email: true } }, tenant: { select: { id: true, legalName: true, store: { select: { name: true, slug: true } } } } },
			}),
			prisma.invoice.findMany({
				orderBy: { createdAt: "desc" },
				take: 15,
				select: { id: true, kind: true, status: true, total: true, currency: true, createdAt: true, tenant: { select: { legalName: true, store: { select: { name: true, slug: true } } } } },
			}),
		])

		return NextResponse.json({
			stats: {
				totalTenants,
				activeTenants,
				trialingTenants,
				suspendedTenants,
				publishedStores,
				productCount,
				orderCount,
				customerCount,
				openTicketCount,
				activeSubscriptionCount,
				pendingSetupFees,
				paidRevenue: revenue._sum.total || 0,
			},
			tenants: tenants.map((tenant) => ({ ...tenant, preview: tenant.store ? previewUrls(tenant.store.slug) : null })),
			activity,
			recentInvoices,
			filters: { search, status, limit },
		})
	} catch (error) {
		console.error("Platform operations unavailable", error)
		return NextResponse.json({ message: "Platform operations unavailable" }, { status: 503 })
	}
}

const mutationSchema = z.object({
	action: z.enum(["suspend_store", "reactivate_store", "approve_verification", "reject_verification", "request_verification"]),
	tenantId: z.string().min(1),
	notes: z.string().trim().max(1000).optional(),
})

export async function PATCH(request: NextRequest) {
	const access = await requirePlatformApi(true)
	if (access.response) return access.response
	try {
		const parsed = mutationSchema.safeParse(await request.json())
		if (!parsed.success) return NextResponse.json({ message: "Invalid platform operation", issues: parsed.error.flatten() }, { status: 400 })
		const tenant = await prisma.tenant.findUnique({ where: { id: parsed.data.tenantId }, select: { id: true, status: true, verificationStatus: true, store: { select: { id: true, publicationStatus: true } } } })
		if (!tenant) return NextResponse.json({ message: "Merchant store not found" }, { status: 404 })
		if (parsed.data.action === "approve_verification") {
			const profile = await prisma.merchantVerificationProfile.findUnique({ where: { tenantId: tenant.id }, select: { businessType: true, taxStatus: true, phoneVerifiedAt: true } })
			const evidence = await prisma.merchantVerificationEvidence.findMany({ where: { tenantId: tenant.id, status: "APPROVED" }, select: { type: true } })
			const requiredTypes = profile ? ["GOVERNMENT_ID", "LOCATION_PROOF", "MPESA_OWNERSHIP", ...(profile.businessType === "REGISTERED_BUSINESS" ? ["BUSINESS_REGISTRATION"] : ["OWNER_DECLARATION"]), ...(profile.taxStatus === "REGISTERED" ? ["KRA_PIN"] : [])] : ["GOVERNMENT_ID", "LOCATION_PROOF", "MPESA_OWNERSHIP"]
			const missing = requiredTypes.filter((type) => !evidence.some((item) => item.type === type))
			if (!profile || !profile.phoneVerifiedAt || missing.length) return NextResponse.json({ message: "The merchant must complete phone verification and all required evidence must be approved before tenant approval.", code: "VERIFICATION_REQUIREMENTS_INCOMPLETE", missingEvidence: missing }, { status: 409 })
		}

		const suspended = parsed.data.action === "suspend_store"
		const verificationAction = parsed.data.action.includes("verification")
		const updated = await prisma.$transaction(async (transaction) => {
			const nextTenant = verificationAction
				? await transaction.tenant.update({ where: { id: tenant.id }, data: { verificationStatus: parsed.data.action === "approve_verification" ? "APPROVED" : parsed.data.action === "reject_verification" ? "REJECTED" : "PENDING_REVIEW", verificationReviewedAt: parsed.data.action === "request_verification" ? null : new Date(), verificationReviewerId: parsed.data.action === "request_verification" ? null : access.session!.user.id, verificationNotes: parsed.data.notes || null } })
				: await transaction.tenant.update({ where: { id: tenant.id }, data: { status: suspended ? "SUSPENDED" : "ACTIVE", suspendedAt: suspended ? new Date() : null } })
			if (tenant.store && (suspended || parsed.data.action === "reject_verification")) await transaction.store.update({ where: { id: tenant.store.id }, data: { publicationStatus: suspended || parsed.data.action === "reject_verification" ? "SUSPENDED" : tenant.store.publicationStatus } })
			if (tenant.store && parsed.data.action === "reactivate_store" && tenant.store.publicationStatus === "SUSPENDED" && tenant.verificationStatus === "APPROVED") await transaction.store.update({ where: { id: tenant.store.id }, data: { publicationStatus: "PUBLISHED" } })
			return nextTenant
		})
		await prisma.adminLog.create({ data: { tenantId: tenant.id, adminId: access.session!.user.id, action: verificationAction ? `MERCHANT_${parsed.data.action.toUpperCase()}` : suspended ? "PLATFORM_SUSPENDED_STORE" : "PLATFORM_REACTIVATED_STORE", details: { previousStatus: tenant.status, nextStatus: updated.status, previousVerificationStatus: tenant.verificationStatus, nextVerificationStatus: updated.verificationStatus, notes: parsed.data.notes || null } } }).catch((error) => console.error("Platform action audit failed", error))
		return NextResponse.json({ tenant: updated })
	} catch (error: any) {
		console.error("Platform operation failed", error)
		return NextResponse.json({ message: error?.message || "Platform operation failed" }, { status: 500 })
	}
}
