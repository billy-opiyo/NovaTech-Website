import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership, requireStorePermission } from "backend/lib/tenant-access"
import { merchantEnquiryUpdateSchema } from "backend/validators/merchantEnquiryValidator"
import { createActionRecord } from "backend/actions"
import { shopperEnquiryDueAt } from "backend/retention/tenant-retention"

async function access(request: NextRequest, roles: MembershipRole[] = [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT]) {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
	const membership = await requireStorePermission(session.user.id, context.tenantId, "MANAGE_ENQUIRIES")
	return { session, context, membership }
}

export async function GET(request: NextRequest) {
	try {
		const { context } = await access(request)
		const status = request.nextUrl.searchParams.get("status") || "ALL"
		const search = request.nextUrl.searchParams.get("search")?.trim() || ""
		const enquiries = await prisma.merchantEnquiry.findMany({
			where: { tenantId: context.tenantId, ...(status !== "ALL" ? { status: status as any } : {}), ...(search ? { OR: [{ customerName: { contains: search, mode: "insensitive" } }, { customerEmail: { contains: search, mode: "insensitive" } }] } : {}) },
			orderBy: { createdAt: "desc" }, take: 200,
			include: { quotes: { orderBy: { createdAt: "desc" }, take: 5 }, user: { select: { name: true, email: true } } },
		})
		const members = await prisma.membership.findMany({ where: { tenantId: context.tenantId, active: true }, select: { userId: true, role: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } })
		return NextResponse.json({ enquiries, members })
	} catch (error: any) { return NextResponse.json({ message: error.message || "Enquiries unavailable" }, { status: error.status || 503 }) }
}

export async function PATCH(request: NextRequest) {
	try {
		const { session, context } = await access(request)
		const id = request.nextUrl.searchParams.get("id")
		if (!id) return NextResponse.json({ message: "Enquiry id is required." }, { status: 400 })
		const parsed = merchantEnquiryUpdateSchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Invalid enquiry update.", issues: parsed.error.flatten() }, { status: 400 })
		if (parsed.data.assignedToId) await requireMembership(parsed.data.assignedToId, context.tenantId)
		const existing = await prisma.merchantEnquiry.findFirst({ where: { id, tenantId: context.tenantId }, select: { id: true, status: true, closedAt: true } })
		if (!existing) return NextResponse.json({ message: "Enquiry not found." }, { status: 404 })
		const nextStatus = parsed.data.status || existing.status
		const now = new Date()
		const closed = ["WON", "LOST", "SPAM"].includes(nextStatus)
		const updated = await prisma.merchantEnquiry.update({ where: { id: existing.id }, data: { ...parsed.data, lastContactedAt: parsed.data.status === "CONTACTED" ? now : undefined, convertedAt: parsed.data.status === "WON" ? now : undefined, ...(closed ? { closedAt: existing.closedAt || now, dataRetentionDueAt: existing.closedAt ? undefined : shopperEnquiryDueAt(now) } : { closedAt: null, dataRetentionDueAt: null }) } })
		await createActionRecord("UPDATED_MERCHANT_ENQUIRY", { tenantId: context.tenantId, adminId: session.user.id, enquiryId: id, from: existing.status, to: parsed.data.status || existing.status }).catch(() => undefined)
		return NextResponse.json({ enquiry: updated })
	} catch (error: any) { return NextResponse.json({ message: error.message || "Unable to update enquiry" }, { status: error.status || 503 }) }
}
