import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { normalizePhone } from "backend/lib/daraja"
import { decryptMerchantVerificationDetails, encryptMerchantVerificationDetails } from "backend/lib/merchant-verification-secrets"
import { apiErrorResponse } from "backend/lib/api-handler"

const profileSchema = z.object({
	businessType: z.enum(["INDIVIDUAL", "REGISTERED_BUSINESS"]),
	taxStatus: z.enum(["REGISTERED", "NOT_REGISTERED", "NOT_APPLICABLE", "UNDER_REVIEW"]),
	locationType: z.enum(["PHYSICAL_LOCATION", "ONLINE_ONLY"]),
	settlementAccountType: z.enum(["PAYBILL", "TILL", "OTHER"]),
	legalName: z.string().trim().min(2).max(160),
	phone: z.string().trim().min(9).max(15),
	businessRegistrationNumber: z.string().trim().max(80).optional().default(""),
	taxIdentifier: z.string().trim().max(80).optional().default(""),
	county: z.string().trim().min(2).max(80),
	town: z.string().trim().min(2).max(80),
	addressLine: z.string().trim().min(5).max(240),
	settlementAccountNumber: z.string().trim().min(3).max(80),
	settlementAccountName: z.string().trim().min(2).max(160),
}).superRefine((value, context) => {
	if (value.businessType === "REGISTERED_BUSINESS" && !value.businessRegistrationNumber) context.addIssue({ code: "custom", path: ["businessRegistrationNumber"], message: "Business registration details are required for registered businesses." })
	if (value.taxStatus === "REGISTERED" && !value.taxIdentifier) context.addIssue({ code: "custom", path: ["taxIdentifier"], message: "A KRA PIN is required when the merchant is registered." })
})

async function access() {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
	await requireStorePermission(session.user.id, context.tenantId, "MANAGE_VERIFICATION")
	return { session, context }
}

export async function GET() {
	try {
		const { context } = await access()
		const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId }, select: { id: true, verificationStatus: true, verificationSubmittedAt: true, verificationReviewedAt: true, verificationNotes: true, verificationProfile: { select: { businessType: true, taxStatus: true, locationType: true, settlementAccountType: true, phoneVerifiedAt: true, updatedAt: true } }, verificationEvidence: { orderBy: { createdAt: "desc" }, select: { id: true, type: true, status: true, contentType: true, sizeBytes: true, reviewedAt: true, reviewNote: true, createdAt: true } } } })
		if (!tenant) return NextResponse.json({ message: "Merchant workspace not found" }, { status: 404 })
		return NextResponse.json({ verification: tenant })
	} catch (error: any) {
		return apiErrorResponse(error, "Verification status unavailable")
	}
}

export async function POST(request: Request) {
	try {
		const { context, session } = await access()
		const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true } })
		if (!user?.emailVerified) return NextResponse.json({ message: "Verify the merchant account email before submitting verification.", code: "EMAIL_VERIFICATION_REQUIRED" }, { status: 409 })
		const parsed = profileSchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Please complete all required merchant verification fields.", issues: parsed.error.flatten() }, { status: 400 })
		const normalizedPhone = normalizePhone(parsed.data.phone)
		const existing = await prisma.merchantVerificationProfile.findUnique({ where: { tenantId: context.tenantId }, select: { sensitiveDetailsCiphertext: true, phoneVerifiedAt: true } })
		let phoneChanged = true
		if (existing) {
			const previousDetails = decryptMerchantVerificationDetails(existing.sensitiveDetailsCiphertext)
			phoneChanged = previousDetails.phone !== normalizedPhone
		}
		const details = {
			legalName: parsed.data.legalName,
			phone: normalizedPhone,
			businessRegistrationNumber: parsed.data.businessRegistrationNumber,
			taxIdentifier: parsed.data.taxIdentifier,
			county: parsed.data.county,
			town: parsed.data.town,
			addressLine: parsed.data.addressLine,
			settlementAccountNumber: parsed.data.settlementAccountNumber,
			settlementAccountName: parsed.data.settlementAccountName,
		}
		const profile = await prisma.merchantVerificationProfile.upsert({
			where: { tenantId: context.tenantId },
			create: { tenantId: context.tenantId, businessType: parsed.data.businessType, taxStatus: parsed.data.taxStatus, locationType: parsed.data.locationType, settlementAccountType: parsed.data.settlementAccountType, sensitiveDetailsCiphertext: encryptMerchantVerificationDetails(details) },
			update: { businessType: parsed.data.businessType, taxStatus: parsed.data.taxStatus, locationType: parsed.data.locationType, settlementAccountType: parsed.data.settlementAccountType, sensitiveDetailsCiphertext: encryptMerchantVerificationDetails(details), ...(phoneChanged ? { phoneVerifiedAt: null, phoneOtpHash: null, phoneOtpSalt: null, phoneOtpExpiresAt: null, phoneOtpAttempts: 0, phoneOtpSentAt: null } : {}) },
			select: { phoneVerifiedAt: true },
		})
		const requiredTypes = ["GOVERNMENT_ID", "LOCATION_PROOF", "MPESA_OWNERSHIP", ...(parsed.data.businessType === "REGISTERED_BUSINESS" ? ["BUSINESS_REGISTRATION"] : ["OWNER_DECLARATION"]), ...(parsed.data.taxStatus === "REGISTERED" ? ["KRA_PIN"] : [])]
		const evidence = await prisma.merchantVerificationEvidence.findMany({ where: { tenantId: context.tenantId, status: { in: ["PENDING", "APPROVED"] } }, select: { type: true } })
		const missingEvidence = requiredTypes.filter((type) => !evidence.some((item) => item.type === type))
		const phoneVerified = !phoneChanged && Boolean(profile.phoneVerifiedAt)
		if (!phoneVerified || missingEvidence.length) {
			await prisma.tenant.update({ where: { id: context.tenantId }, data: { verificationStatus: "IN_PROGRESS" } })
			return NextResponse.json({ message: !phoneVerified ? "Details saved. Verify the merchant phone before submitting for review." : "Details saved. Upload the required verification evidence before submitting for review.", code: !phoneVerified ? "PHONE_VERIFICATION_REQUIRED" : "EVIDENCE_REQUIRED", missingEvidence, verificationStatus: "IN_PROGRESS" }, { status: 409 })
		}
		const verification = await prisma.tenant.update({ where: { id: context.tenantId }, data: { verificationStatus: "PENDING_REVIEW", verificationSubmittedAt: new Date(), verificationReviewedAt: null, verificationReviewerId: null, verificationNotes: null }, select: { verificationStatus: true, verificationSubmittedAt: true } })
		return NextResponse.json({ message: "Verification request submitted for Nurava review.", verification })
	} catch (error: any) {
		if (error.message === "Invalid Kenyan phone number format") return NextResponse.json({ message: error.message }, { status: 400 })
		return apiErrorResponse(error, "Unable to submit verification")
	}
}
