import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { decryptMerchantVerificationDetails } from "backend/lib/merchant-verification-secrets"
import { sendSmsMessage } from "backend/lib/sms"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { apiErrorResponse } from "backend/lib/api-handler"
import { isMerchantVerificationRequired } from "backend/lib/merchant-verification"
import {
	sendMerchantPhoneOtp,
	verifyMerchantPhoneOtp,
} from "backend/lib/merchant-phone-otp"
import { createPrismaMerchantPhoneOtpStore } from "backend/lib/merchant-phone-otp-store"

async function access() {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
	await requireStorePermission(session.user.id, context.tenantId, "MANAGE_VERIFICATION")
	return { context }
}

const merchantPhoneOtpStore = createPrismaMerchantPhoneOtpStore(prisma.merchantVerificationProfile)

export async function POST(request: NextRequest) {
	if (!isMerchantVerificationRequired()) return NextResponse.json({ message: "Merchant phone OTP is not required under the current light-onboarding policy.", code: "VERIFICATION_NOT_REQUIRED" }, { status: 410 })
	const limited = await rateLimiter(request, "merchant-verification-phone")
	if (limited) return limited
	try {
		const { context } = await access()
		const profile = await prisma.merchantVerificationProfile.findUnique({ where: { tenantId: context.tenantId }, select: { id: true, sensitiveDetailsCiphertext: true } })
		if (!profile) return NextResponse.json({ message: "Save the merchant verification details first." }, { status: 409 })
		const details = decryptMerchantVerificationDetails(profile.sensitiveDetailsCiphertext)
		if (!details.phone) return NextResponse.json({ message: "A merchant phone number is required." }, { status: 409 })

		const sent = await sendMerchantPhoneOtp({
			store: merchantPhoneOtpStore,
			profileId: profile.id,
			phone: details.phone,
			sendSms: (to, message) => sendSmsMessage({ to, message }),
		})
		if (sent === "cooldown") return NextResponse.json({ message: "Wait one minute before requesting another code." }, { status: 429 })
		return NextResponse.json({ message: "A verification code was sent to the merchant phone.", phoneVerification: "CODE_SENT" })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to send verification code. Please try again.")
	}
}

export async function PATCH(request: NextRequest) {
	if (!isMerchantVerificationRequired()) return NextResponse.json({ message: "Merchant phone OTP is not required under the current light-onboarding policy.", code: "VERIFICATION_NOT_REQUIRED" }, { status: 410 })
	const limited = await rateLimiter(request, "merchant-verification-phone-confirm")
	if (limited) return limited
	try {
		const { context } = await access()
		const parsed = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Enter the six-digit verification code." }, { status: 400 })
		const profile = await prisma.merchantVerificationProfile.findUnique({ where: { tenantId: context.tenantId }, select: { id: true } })
		if (!profile) return NextResponse.json({ message: "That verification code has expired. Request a new one." }, { status: 400 })

		const result = await verifyMerchantPhoneOtp({ store: merchantPhoneOtpStore, profileId: profile.id, code: parsed.data.code })
		if (result === "expired") return NextResponse.json({ message: "That verification code has expired. Request a new one." }, { status: 400 })
		if (result === "too_many_attempts") return NextResponse.json({ message: "Too many incorrect attempts. Request a new code." }, { status: 429 })
		if (result === "invalid") return NextResponse.json({ message: "The verification code is incorrect." }, { status: 400 })
		return NextResponse.json({ message: "Merchant phone verified.", phoneVerification: "VERIFIED" })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Unable to verify merchant phone")
	}
}
