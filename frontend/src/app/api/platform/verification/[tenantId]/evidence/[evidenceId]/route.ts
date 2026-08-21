import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { getSignedDownloadUrl } from "backend/lib/storage"

const reviewRoles = new Set(["PLATFORM_OWNER", "PLATFORM_ADMIN"])

async function requireReviewer() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (session.user.role !== "SUPERADMIN" && !reviewRoles.has(session.user.platformRole || "")) return { response: NextResponse.json({ message: "Verification reviewer access required" }, { status: 403 }) }
	return { session }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ tenantId: string; evidenceId: string }> }) {
	const access = await requireReviewer()
	if (access.response) return access.response
	try {
		const { tenantId, evidenceId } = await params
		const evidence = await prisma.merchantVerificationEvidence.findFirst({ where: { id: evidenceId, tenantId }, select: { objectKey: true, status: true, contentType: true } })
		if (!evidence) return NextResponse.json({ message: "Evidence not found" }, { status: 404 })
		const url = await getSignedDownloadUrl(evidence.objectKey)
		return NextResponse.json({ downloadUrl: url, status: evidence.status, contentType: evidence.contentType, expiresIn: 300 })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Evidence download unavailable" }, { status: 503 })
	}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string; evidenceId: string }> }) {
	const access = await requireReviewer()
	if (access.response) return access.response
	try {
		const { tenantId, evidenceId } = await params
		const parsed = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]), reviewNote: z.string().trim().max(1000).optional() }).safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Invalid evidence review" }, { status: 400 })
		const evidence = await prisma.merchantVerificationEvidence.updateMany({ where: { id: evidenceId, tenantId }, data: { status: parsed.data.status, reviewedAt: parsed.data.status === "PENDING" ? null : new Date(), reviewedById: parsed.data.status === "PENDING" ? null : access.session!.user.id, reviewNote: parsed.data.reviewNote || null } })
		if (!evidence.count) return NextResponse.json({ message: "Evidence not found" }, { status: 404 })
		return NextResponse.json({ status: parsed.data.status })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Unable to review evidence" }, { status: 503 })
	}
}
