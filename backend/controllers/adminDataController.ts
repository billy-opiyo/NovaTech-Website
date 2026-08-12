import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "../lib/db"
import { createActionRecord } from "../actions"

const isAdmin = (role?: string) => role === "ADMIN" || role === "SUPERADMIN"

async function admin() {
	const session = await getServerSession()
	return session?.user && isAdmin(session.user.role) ? session.user : null
}

export async function getCustomers(req: NextRequest) {
	if (!await admin()) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	const search = req.nextUrl.searchParams.get("search")?.trim()
	const users = await prisma.user.findMany({
		where: { role: "CUSTOMER", ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) },
		select: { id: true, name: true, email: true, image: true, createdAt: true, _count: { select: { orders: true } }, orders: { select: { total: true, createdAt: true }, orderBy: { createdAt: "desc" } } },
		orderBy: { createdAt: "desc" },
	})
	const customers = users.map((user) => ({ ...user, totalOrders: user._count.orders, totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0), lastOrder: user.orders[0]?.createdAt ?? null, status: user._count.orders >= 10 ? "vip" : user._count.orders ? "active" : "inactive" }))
	return NextResponse.json({ customers, stats: { total: customers.length, active: customers.filter((c) => c.status === "active").length, vip: customers.filter((c) => c.status === "vip").length, inactive: customers.filter((c) => c.status === "inactive").length, totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0) } })
}

export async function getCoupons(req: NextRequest) {
	if (!await admin()) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	const search = req.nextUrl.searchParams.get("search")?.trim()
	const coupons = await prisma.coupon.findMany({ where: search ? { code: { contains: search, mode: "insensitive" } } : undefined, orderBy: { expiresAt: "desc" } })
	return NextResponse.json({ coupons })
}

export async function createCoupon(req: NextRequest) {
	const user = await admin()
	if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	try {
		const body = await req.json()
		const code = String(body.code || "").trim().toUpperCase()
		const discountPercent = body.discountPercent == null ? null : Number(body.discountPercent)
		const discountAmount = body.discountAmount == null ? null : Number(body.discountAmount)
		if (!/^[A-Z0-9_-]{3,32}$/.test(code) || (discountPercent == null && discountAmount == null) || (discountPercent != null && discountAmount != null) || !body.expiresAt) return NextResponse.json({ message: "Invalid coupon data" }, { status: 400 })
		const coupon = await prisma.coupon.create({ data: { code, discountPercent, discountAmount, minOrderValue: body.minOrderValue == null ? null : Number(body.minOrderValue), expiresAt: new Date(body.expiresAt), usageLimit: body.usageLimit == null ? null : Number(body.usageLimit), isActive: body.isActive !== false } })
		await createActionRecord("CREATED_COUPON", { adminId: user.id, couponId: coupon.id, code })
		return NextResponse.json(coupon, { status: 201 })
	} catch (error: any) { return NextResponse.json({ message: error.code === "P2002" ? "Coupon code already exists" : error.message }, { status: 400 }) }
}

export async function updateCoupon(req: NextRequest) {
	const user = await admin()
	if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	try {
		const body = await req.json()
		if (!body.id) return NextResponse.json({ message: "Coupon id is required" }, { status: 400 })
		const coupon = await prisma.coupon.update({ where: { id: body.id }, data: { ...(body.code ? { code: String(body.code).trim().toUpperCase() } : {}), ...(body.isActive === undefined ? {} : { isActive: Boolean(body.isActive) }), ...(body.expiresAt ? { expiresAt: new Date(body.expiresAt) } : {}), ...(body.usageLimit === undefined ? {} : { usageLimit: body.usageLimit == null ? null : Number(body.usageLimit) }) } })
		await createActionRecord("UPDATED_COUPON", { adminId: user.id, couponId: coupon.id })
		return NextResponse.json(coupon)
	} catch (error: any) { return NextResponse.json({ message: error.message }, { status: 400 }) }
}

export async function deleteCoupon(req: NextRequest) {
	const user = await admin()
	if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	const id = req.nextUrl.searchParams.get("id")
	if (!id) return NextResponse.json({ message: "Coupon id is required" }, { status: 400 })
	await prisma.coupon.delete({ where: { id } })
	await createActionRecord("DELETED_COUPON", { adminId: user.id, couponId: id })
	return NextResponse.json({ ok: true })
}

export async function getAdminReviews(req: NextRequest) {
	if (!await admin()) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	const status = req.nextUrl.searchParams.get("status") as any
	const reviews = await prisma.review.findMany({ where: status && status !== "ALL" ? { moderationStatus: status } : undefined, include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
	const [total, pending, approved, flagged] = await Promise.all([prisma.review.count(), prisma.review.count({ where: { moderationStatus: "PENDING" } }), prisma.review.count({ where: { moderationStatus: "APPROVED" } }), prisma.review.count({ where: { moderationStatus: "FLAGGED" } })])
	return NextResponse.json({ reviews, stats: { total, pending, approved, flagged } })
}

export async function moderateReview(req: NextRequest) {
	const user = await admin()
	if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	const body = await req.json()
	if (!body.id || !["PENDING", "APPROVED", "REJECTED", "FLAGGED"].includes(body.moderationStatus)) return NextResponse.json({ message: "Invalid moderation request" }, { status: 400 })
	const review = await prisma.review.update({ where: { id: body.id }, data: { moderationStatus: body.moderationStatus } })
	await createActionRecord("MODERATED_REVIEW", { adminId: user.id, reviewId: review.id, status: body.moderationStatus })
	return NextResponse.json(review)
}

export async function getDeliveries(req: NextRequest) {
	if (!await admin()) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	const status = req.nextUrl.searchParams.get("status")
	const orders = await prisma.order.findMany({ where: status && status !== "ALL" ? { status: status as any } : undefined, include: { user: { select: { name: true, email: true } }, items: { select: { quantity: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
	return NextResponse.json({ deliveries: orders.map((order) => ({ ...order, customer: order.user?.name || (order.shippingAddress as any)?.fullName || "Guest", itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0) })) })
}

export async function getSecurity(req: NextRequest) {
	if (!await admin()) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
	const [events, admins] = await Promise.all([prisma.loginEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, role: true } } } }), prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPERADMIN"] } }, select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "asc" } })])
	return NextResponse.json({ events, admins, stats: { totalLogins: events.length, successful: events.filter((event) => event.success).length, failed: events.filter((event) => !event.success).length, activeAdmins: admins.length } })
}
