import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"

export async function GET() {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest({ headers: await headers() })
		await requireMembership(session.user.id, context.tenantId)
		const tenant = await prisma.tenant.findFirst({ where: { id: context.tenantId }, select: { id: true, status: true, plan: { select: { key: true, name: true, price: true, currency: true, billingInterval: true, entitlementsJson: true } }, subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, trialEndsAt: true } } } })
		if (!tenant) return NextResponse.json({ message: "Tenant not found" }, { status: 404 })
		return NextResponse.json({ tenant })
	} catch (error) {
		console.error("Billing status unavailable", error)
		return NextResponse.json({ message: "Billing status unavailable until the database and billing provider are configured" }, { status: 503 })
	}
}
