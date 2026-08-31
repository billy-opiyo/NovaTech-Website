import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "EXPORT_DATA")

		const [tenant, store, memberships, domains, settingsVersions, categories, products, orders, payments, reviews, coupons, supportTickets, legalAcceptances] = await Promise.all([
			prisma.tenant.findFirst({ where: { id: context.tenantId }, select: { id: true, legalName: true, status: true, createdAt: true, dataRetentionStartsAt: true, dataDeletionDueAt: true } }),
			prisma.store.findFirst({ where: { id: context.storeId, tenantId: context.tenantId }, select: { id: true, name: true, slug: true, publicationStatus: true, defaultLocale: true, currency: true, country: true, timezone: true, logoUrl: true, faviconUrl: true, themeSettings: true, seoSettings: true, contactSettings: true, homepageSettings: true, commerceSettings: true, publishedAt: true, createdAt: true } }),
			prisma.membership.findMany({ where: { tenantId: context.tenantId }, select: { id: true, userId: true, role: true, active: true, invitedAt: true, acceptedAt: true, createdAt: true, user: { select: { name: true, email: true } } } }),
			prisma.domain.findMany({ where: { tenantId: context.tenantId, storeId: context.storeId }, select: { id: true, hostname: true, type: true, verificationStatus: true, sslStatus: true, isCanonical: true, verifiedAt: true, createdAt: true } }),
			prisma.storeSettingsVersion.findMany({ where: { tenantId: context.tenantId, storeId: context.storeId }, select: { version: true, settings: true, publishedAt: true, publishedBy: true, createdAt: true }, orderBy: { version: "asc" } }),
			prisma.category.findMany({ where: { tenantId: context.tenantId }, select: { id: true, name: true, slug: true, description: true, imageUrl: true, parentId: true } }),
			prisma.product.findMany({ where: { tenantId: context.tenantId }, select: { id: true, name: true, slug: true, description: true, brand: true, sku: true, price: true, discountedPrice: true, stock: true, isFeatured: true, isNewArrival: true, warranty: true, weight: true, dimensions: true, specs: true, images: true, categoryId: true, createdAt: true, updatedAt: true, variants: { where: { tenantId: context.tenantId }, select: { id: true, name: true, value: true, priceModifier: true, stock: true, sku: true } } } }),
			prisma.order.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "asc" }, select: { id: true, userId: true, guestEmail: true, status: true, subtotal: true, shippingCost: true, total: true, paymentMethod: true, shippingAddress: true, trackingNumber: true, notes: true, createdAt: true, updatedAt: true, items: { where: { tenantId: context.tenantId }, select: { id: true, productId: true, quantity: true, price: true, variant: true, product: { select: { name: true, sku: true } } } } } }),
			prisma.payment.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "asc" }, select: { id: true, orderId: true, provider: true, amount: true, currency: true, status: true, phoneNumber: true, customerEmail: true, createdAt: true, updatedAt: true } }),
			prisma.review.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "asc" }, select: { id: true, userId: true, productId: true, rating: true, title: true, comment: true, photos: true, isVerifiedPurchase: true, moderationStatus: true, createdAt: true, updatedAt: true, user: { select: { name: true, email: true } }, product: { select: { name: true, sku: true } } } }),
			prisma.coupon.findMany({ where: { tenantId: context.tenantId }, select: { id: true, code: true, discountPercent: true, discountAmount: true, minOrderValue: true, expiresAt: true, usageLimit: true, usedCount: true, isActive: true } }),
			prisma.supportTicket.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "asc" }, select: { id: true, userId: true, customerName: true, customerEmail: true, customerPhone: true, subject: true, description: true, category: true, priority: true, status: true, orderId: true, assignedTo: true, attachments: true, createdAt: true, updatedAt: true, replies: { where: { tenantId: context.tenantId }, select: { id: true, reply: true, isAdmin: true, createdAt: true } } } }),
			prisma.merchantLegalAcceptance.findMany({ where: { tenantId: context.tenantId }, orderBy: { acceptedAt: "asc" }, select: { id: true, context: true, termsVersion: true, privacyVersion: true, agreementVersion: true, acceptedAt: true, acceptedById: true } }),
		])

		if (!tenant || !store) return NextResponse.json({ message: "Tenant data unavailable" }, { status: 404 })
		const payload = { format: "novatech-tenant-export", version: 1, exportedAt: new Date().toISOString(), tenant, store, memberships, domains, settingsVersions, categories, products, orders, payments, reviews, coupons, supportTickets, legalAcceptances }
		return NextResponse.json(payload, { headers: { "Content-Disposition": `attachment; filename="${context.storeSlug}-export.json"`, "Cache-Control": "no-store" } })
	} catch (error: any) {
		console.error("Tenant data export unavailable", error)
		return apiErrorResponse(error, "Tenant data export is unavailable until the database is configured")
	}
}
