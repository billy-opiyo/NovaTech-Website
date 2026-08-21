import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"

async function access() {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
	await requireMembership(session.user.id, context.tenantId, ["STORE_OWNER", "STORE_ADMIN"])
	return { session, context }
}

export async function GET() {
	try {
		const { context } = await access()
		const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId }, select: { id: true, verificationStatus: true, verificationSubmittedAt: true, verificationReviewedAt: true, verificationNotes: true } })
		if (!tenant) return NextResponse.json({ message: "Merchant workspace not found" }, { status: 404 })
		return NextResponse.json({ verification: tenant })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Verification status unavailable" }, { status: error.status || 503 })
	}
}

export async function POST() {
	try {
		const { context } = await access()
		const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId }, select: { verificationStatus: true } })
		if (!tenant) return NextResponse.json({ message: "Merchant workspace not found" }, { status: 404 })
		if (tenant.verificationStatus === "APPROVED") return NextResponse.json({ message: "Merchant verification is already approved.", verificationStatus: tenant.verificationStatus })
		const verification = await prisma.tenant.update({ where: { id: context.tenantId }, data: { verificationStatus: "PENDING_REVIEW", verificationSubmittedAt: new Date(), verificationReviewedAt: null, verificationReviewerId: null, verificationNotes: null }, select: { verificationStatus: true, verificationSubmittedAt: true } })
		return NextResponse.json({ message: "Verification request submitted for Nurava review.", verification })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Unable to submit verification" }, { status: error.status || 503 })
	}
}
