import { NextRequest, NextResponse } from "next/server"
import prisma from "../lib/db"
import { createActionRecord } from "../actions"
import { MembershipRole } from "@prisma/client"
import { requireStoreAccess } from "../lib/store-access"
import { couponCreateSchema, couponUpdateSchema } from "../validators/couponValidator"

export async function getCustomers(req: NextRequest) {
	const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT])
	const search = req.nextUrl.searchParams.get("search")?.trim()
	const users = await prisma.user.findMany({
		where: { role: "CUSTOMER", orders: { some: { tenantId: context.tenantId } }, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) },
		select: { id: true, name: true, email: true, image: true, createdAt: true, orders: { where: { tenantId: context.tenantId }, select: { total: true, createdAt: true }, orderBy: { createdAt: "desc" } } },
		orderBy: { createdAt: "desc" },
	})
	const customers = users.map((user) => ({ ...user, totalOrders: user.orders.length, totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0), lastOrder: user.orders[0]?.createdAt ?? null, status: user.orders.length >= 10 ? "vip" : "active" }))
	return NextResponse.json({ customers, stats: { total: customers.length, active: customers.filter((c) => c.status === "active").length, vip: customers.filter((c) => c.status === "vip").length, inactive: customers.filter((c) => c.status === "inactive").length, totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0) } })
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
	} catch (error: any) { return NextResponse.json({ message: error.code === "P2002" ? "Coupon code already exists" : error.message }, { status: 400 }) }
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
	} catch (error: any) { return NextResponse.json({ message: error.message }, { status: 400 }) }
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
	const status = req.nextUrl.searchParams.get("status") as any
	const scoped = { tenantId: context.tenantId, ...(status && status !== "ALL" ? { moderationStatus: status } : {}) }
	const reviews = await prisma.review.findMany({ where: scoped, include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
	const [total, pending, approved, flagged] = await Promise.all([prisma.review.count({ where: { tenantId: context.tenantId } }), prisma.review.count({ where: { tenantId: context.tenantId, moderationStatus: "PENDING" } }), prisma.review.count({ where: { tenantId: context.tenantId, moderationStatus: "APPROVED" } }), prisma.review.count({ where: { tenantId: context.tenantId, moderationStatus: "FLAGGED" } })])
	return NextResponse.json({ reviews, stats: { total, pending, approved, flagged } })
}

export async function moderateReview(req: NextRequest) {
	const { context, session } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER])
	const body = await req.json()
	if (!body.id || !["PENDING", "APPROVED", "REJECTED", "FLAGGED"].includes(body.moderationStatus)) return NextResponse.json({ message: "Invalid moderation request" }, { status: 400 })
	const existing = await prisma.review.findFirst({ where: { id: body.id, tenantId: context.tenantId }, select: { id: true } })
	if (!existing) return NextResponse.json({ message: "Review not found" }, { status: 404 })
	const review = await prisma.review.update({ where: { id: existing.id }, data: { moderationStatus: body.moderationStatus } })
	await createActionRecord("MODERATED_REVIEW", { adminId: session.user.id, tenantId: context.tenantId, reviewId: review.id, status: body.moderationStatus })
	return NextResponse.json(review)
}

export async function getDeliveries(req: NextRequest) {
	const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT])
	const status = req.nextUrl.searchParams.get("status")
	const orders = await prisma.order.findMany({ where: { tenantId: context.tenantId, ...(status && status !== "ALL" ? { status: status as any } : {}) }, include: { user: { select: { name: true, email: true } }, items: { select: { quantity: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
	return NextResponse.json({ deliveries: orders.map((order) => ({ ...order, customer: order.user?.name || (order.shippingAddress as any)?.fullName || "Guest", itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0) })) })
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
