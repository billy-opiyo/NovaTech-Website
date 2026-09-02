import { NextRequest, NextResponse } from "next/server"
import prisma from "../lib/db"
import { createActionRecord } from "../actions"
import { MembershipRole, OrderStatus, Prisma, ReviewModerationStatus } from "@prisma/client"
import { requireStoreAccess } from "../lib/store-access"
import { couponCreateSchema, couponUpdateSchema } from "../validators/couponValidator"
import { apiErrorResponse } from "../lib/api-handler"
import { parsePagination } from "../lib/pagination"
import { adminReviewDeleteSchema, adminReviewUpdateSchema } from "../validators/reviewValidator"

function errorCode(error: unknown): string | undefined {
	return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined
}

export async function getCustomers(req: NextRequest) {
	const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT])
	const search = req.nextUrl.searchParams.get("search")?.trim()
	const { page, limit, skip } = parsePagination(req.nextUrl.searchParams, 100)
	const settledOrderWhere = { tenantId: context.tenantId, payments: { some: { status: "COMPLETED" as const } } }
	const customerWhere = { role: "CUSTOMER" as const, orders: { some: { tenantId: context.tenantId } }, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } : {}) }
	const [users, total, revenue, settledGroups] = await Promise.all([
		prisma.user.findMany({ where: customerWhere, select: { id: true, name: true, email: true, image: true, createdAt: true }, orderBy: { createdAt: "desc" }, skip, take: limit }),
		prisma.user.count({ where: customerWhere }),
		prisma.order.aggregate({ where: settledOrderWhere, _sum: { total: true } }),
		prisma.order.groupBy({ by: ["userId"], where: { ...settledOrderWhere, userId: { not: null } }, _count: { _all: true }, _sum: { total: true }, _max: { createdAt: true } }),
	])
	const settledByUser = new Map(settledGroups.filter((group) => group.userId).map((group) => [group.userId as string, group]))
	const customers = users.map((user) => {
		const settled = settledByUser.get(user.id)
		const totalOrders = settled?._count._all || 0
		return { ...user, totalOrders, totalSpent: settled?._sum.total || 0, lastOrder: settled?._max.createdAt || null, status: totalOrders >= 10 ? "vip" : totalOrders > 0 ? "active" : "inactive" }
	})
	const active = settledGroups.filter((group) => group._count._all > 0 && group._count._all < 10).length
	const vip = settledGroups.filter((group) => group._count._all >= 10).length
	return NextResponse.json({ customers, page, totalPages: Math.ceil(total / limit), stats: { total, active, vip, inactive: Math.max(0, total - active - vip), totalRevenue: revenue._sum.total || 0 } })
}

export async function getCoupons(req: NextRequest) {
	const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])
	const search = req.nextUrl.searchParams.get("search")?.trim()
	const coupons = await prisma.coupon.findMany({ where: { tenantId: context.tenantId, ...(search ? { code: { contains: search, mode: "insensitive" } } : {}) }, orderBy: { expiresAt: "desc" } })
	return NextResponse.json({ coupons })
}

export async function createCoupon(req: NextRequest) {
	const { context, session } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])
	try {
		const parsed = couponCreateSchema.safeParse(await req.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Invalid coupon data", issues: parsed.error.flatten() }, { status: 400 })
		const data = parsed.data
		const coupon = await prisma.coupon.create({ data: { tenantId: context.tenantId, code: data.code, discountPercent: data.discountPercent ?? null, discountAmount: data.discountAmount ?? null, minOrderValue: data.minOrderValue ?? null, expiresAt: new Date(data.expiresAt), usageLimit: data.usageLimit ?? null, isActive: data.isActive !== false } })
		await createActionRecord("CREATED_COUPON", { adminId: session.user.id, tenantId: context.tenantId, couponId: coupon.id, code: data.code })
		return NextResponse.json(coupon, { status: 201 })
	} catch (error: unknown) { return errorCode(error) === "P2002" ? NextResponse.json({ message: "Coupon code already exists" }, { status: 409 }) : apiErrorResponse(error, "Unable to create coupon") }
}

export async function updateCoupon(req: NextRequest) {
	const { context, session } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])
	try {
		const parsed = couponUpdateSchema.safeParse(await req.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Invalid coupon update", issues: parsed.error.flatten() }, { status: 400 })
		const data = parsed.data
		const existing = await prisma.coupon.findFirst({ where: { id: data.id, tenantId: context.tenantId }, select: { id: true } })
		if (!existing) return NextResponse.json({ message: "Coupon not found" }, { status: 404 })
		const coupon = await prisma.coupon.update({ where: { id: existing.id }, data: { ...(data.code === undefined ? {} : { code: data.code }), ...(data.isActive === undefined ? {} : { isActive: data.isActive }), ...(data.expiresAt === undefined ? {} : { expiresAt: new Date(data.expiresAt) }), ...(data.usageLimit === undefined ? {} : { usageLimit: data.usageLimit }) } })
		await createActionRecord("UPDATED_COUPON", { adminId: session.user.id, tenantId: context.tenantId, couponId: coupon.id })
		return NextResponse.json(coupon)
	} catch (error: unknown) { return apiErrorResponse(error, "Unable to update coupon") }
}

export async function deleteCoupon(req: NextRequest) {
	const { context, session } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])
	const id = req.nextUrl.searchParams.get("id")
	if (!id) return NextResponse.json({ message: "Coupon id is required" }, { status: 400 })
	const existing = await prisma.coupon.findFirst({ where: { id, tenantId: context.tenantId }, select: { id: true } })
	if (!existing) return NextResponse.json({ message: "Coupon not found" }, { status: 404 })
	await prisma.coupon.delete({ where: { id: existing.id } })
	await createActionRecord("DELETED_COUPON", { adminId: session.user.id, tenantId: context.tenantId, couponId: id })
	return NextResponse.json({ ok: true })
}

export async function getAdminReviews(req: NextRequest) {
	const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT])
	const rawStatus = req.nextUrl.searchParams.get("status")
	const status = rawStatus && Object.values(ReviewModerationStatus).includes(rawStatus as ReviewModerationStatus) ? rawStatus as ReviewModerationStatus : undefined
	const scoped: Prisma.ReviewWhereInput = { tenantId: context.tenantId, ...(status ? { moderationStatus: status } : {}) }
	const reviews = await prisma.review.findMany({ where: scoped, include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
	const [total, pending, approved, flagged] = await Promise.all([prisma.review.count({ where: { tenantId: context.tenantId } }), prisma.review.count({ where: { tenantId: context.tenantId, moderationStatus: "PENDING" } }), prisma.review.count({ where: { tenantId: context.tenantId, moderationStatus: "APPROVED" } }), prisma.review.count({ where: { tenantId: context.tenantId, moderationStatus: "FLAGGED" } })])
	return NextResponse.json({ reviews, stats: { total, pending, approved, flagged } })
}

export async function moderateReview(req: NextRequest) {
	const { context, session } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])
	const body = await req.json().catch(() => null)
	if (body?.action === "edit") {
		const parsed = adminReviewUpdateSchema.safeParse(body)
		if (!parsed.success) return NextResponse.json({ message: "Invalid review edit", issues: parsed.error.flatten() }, { status: 400 })
		const existing = await prisma.review.findFirst({ where: { id: parsed.data.id, tenantId: context.tenantId }, select: { id: true } })
		if (!existing) return NextResponse.json({ message: "Review not found" }, { status: 404 })
		const review = await prisma.review.update({ where: { id: existing.id }, data: { rating: parsed.data.rating, title: parsed.data.title ?? null, comment: parsed.data.comment, moderationStatus: "PENDING" } })
		await createActionRecord("EDITED_REVIEW", { adminId: session.user.id, tenantId: context.tenantId, reviewId: review.id, moderationStatus: "PENDING" })
		return NextResponse.json({ ...review, message: "Review corrected and returned to pending approval" })
	}
	if (!body.id || !["PENDING", "APPROVED", "REJECTED", "FLAGGED"].includes(body.moderationStatus)) return NextResponse.json({ message: "Invalid moderation request" }, { status: 400 })
	const existing = await prisma.review.findFirst({ where: { id: body.id, tenantId: context.tenantId }, select: { id: true } })
	if (!existing) return NextResponse.json({ message: "Review not found" }, { status: 404 })
	const review = await prisma.review.update({ where: { id: existing.id }, data: { moderationStatus: body.moderationStatus } })
	await createActionRecord("MODERATED_REVIEW", { adminId: session.user.id, tenantId: context.tenantId, reviewId: review.id, status: body.moderationStatus })
	return NextResponse.json(review)
}

export async function deleteAdminReview(req: NextRequest) {
	const { context, session } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])
	const parsed = adminReviewDeleteSchema.safeParse(await req.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid review delete request" }, { status: 400 })
	const existing = await prisma.review.findFirst({ where: { id: parsed.data.id, tenantId: context.tenantId }, select: { id: true } })
	if (!existing) return NextResponse.json({ message: "Review not found" }, { status: 404 })
	await prisma.review.delete({ where: { id: existing.id } })
	await createActionRecord("DELETED_REVIEW", { adminId: session.user.id, tenantId: context.tenantId, reviewId: existing.id })
	return NextResponse.json({ ok: true, message: "Review deleted" })
}

export async function getDeliveries(req: NextRequest) {
	const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT])
	const rawStatus = req.nextUrl.searchParams.get("status")
	const status = rawStatus && Object.values(OrderStatus).includes(rawStatus as OrderStatus) ? rawStatus as OrderStatus : undefined
	const orders = await prisma.order.findMany({ where: { tenantId: context.tenantId, ...(status && rawStatus !== "ALL" ? { status } : {}) }, include: { user: { select: { name: true, email: true } }, items: { select: { quantity: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
	return NextResponse.json({ deliveries: orders.map((order) => {
		const address = order.shippingAddress && typeof order.shippingAddress === "object" && !Array.isArray(order.shippingAddress) ? order.shippingAddress as { fullName?: unknown } : {}
		const fullName = typeof address.fullName === "string" ? address.fullName : "Guest"
		return { ...order, customer: order.user?.name || fullName, itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0) }
	}) })
}

export async function getSecurity(req: NextRequest) {
	const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])
	const memberships = await prisma.membership.findMany({ where: { tenantId: context.tenantId, active: true }, select: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } }, orderBy: { createdAt: "asc" } })
	const memberIds = memberships.map(({ user }) => user.id)
	const [events, admins] = await Promise.all([
		memberIds.length ? prisma.loginEvent.findMany({ where: { tenantId: context.tenantId, userId: { in: memberIds } }, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, role: true } } } }) : Promise.resolve([]),
		Promise.resolve(memberships.map(({ user }) => user)),
	])
	return NextResponse.json({ events, admins, stats: { totalLogins: events.length, successful: events.filter((event) => event.success).length, failed: events.filter((event) => !event.success).length, activeAdmins: admins.length } })
}
