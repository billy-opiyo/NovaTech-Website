import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { decryptMerchantVerificationDetails } from "backend/lib/merchant-verification-secrets"

const reviewRoles = new Set(["PLATFORM_OWNER", "PLATFORM_ADMIN"])

async function requireReviewer() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (session.user.role !== "SUPERADMIN" && !reviewRoles.has(session.user.platformRole || "")) return { response: NextResponse.json({ message: "Verification reviewer access required" }, { status: 403 }) }
	return { session }
}

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
	const access = await requireReviewer()
	if (access.response) return access.response
	try {
		const { tenantId } = await params
		const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, legalName: true, status: true, verificationStatus: true, verificationSubmittedAt: true, verificationReviewedAt: true, verificationNotes: true, verificationProfile: { select: { businessType: true, taxStatus: true, locationType: true, settlementAccountType: true, sensitiveDetailsCiphertext: true, phoneVerifiedAt: true, updatedAt: true } }, verificationEvidence: { orderBy: { createdAt: "desc" }, select: { id: true, type: true, status: true, contentType: true, sizeBytes: true, reviewedAt: true, reviewNote: true, createdAt: true } } } })
		if (!tenant) return NextResponse.json({ message: "Merchant not found" }, { status: 404 })
		const { sensitiveDetailsCiphertext, ...profile } = tenant.verificationProfile || {}
		return NextResponse.json({ tenant: { ...tenant, verificationProfile: sensitiveDetailsCiphertext ? { ...profile, details: decryptMerchantVerificationDetails(sensitiveDetailsCiphertext) } : null } })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Verification review unavailable" }, { status: 503 })
	}
}
