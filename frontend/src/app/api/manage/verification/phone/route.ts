import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { decryptMerchantVerificationDetails, hashMerchantVerificationOtp } from "backend/lib/merchant-verification-secrets"
import { sendSmsMessage } from "backend/lib/sms"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { apiErrorResponse } from "backend/lib/api-handler"

async function access() {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
	await requireStorePermission(session.user.id, context.tenantId, "MANAGE_VERIFICATION")
	return { context }
}

export async function POST(request: NextRequest) {
	const limited = await rateLimiter(request, "merchant-verification-phone")
	if (limited) return limited
	try {
		const { context } = await access()
		const profile = await prisma.merchantVerificationProfile.findUnique({ where: { tenantId: context.tenantId }, select: { id: true, sensitiveDetailsCiphertext: true, phoneOtpSentAt: true } })
		if (!profile) return NextResponse.json({ message: "Save the merchant verification details first." }, { status: 409 })
		if (profile.phoneOtpSentAt && Date.now() - profile.phoneOtpSentAt.getTime() < 60_000) return NextResponse.json({ message: "Wait one minute before requesting another code." }, { status: 429 })
		const details = decryptMerchantVerificationDetails(profile.sensitiveDetailsCiphertext)
		if (!details.phone) return NextResponse.json({ message: "A merchant phone number is required." }, { status: 409 })
		const code = crypto.randomInt(100000, 1000000).toString()
		const salt = crypto.randomBytes(16).toString("base64url")
		await sendSmsMessage({ to: details.phone, message: `Nurava Tech verification code: ${code}. It expires in 10 minutes. Do not share this code.` })
		await prisma.merchantVerificationProfile.update({ where: { id: profile.id }, data: { phoneOtpHash: hashMerchantVerificationOtp(code, salt), phoneOtpSalt: salt, phoneOtpExpiresAt: new Date(Date.now() + 10 * 60_000), phoneOtpAttempts: 0, phoneOtpSentAt: new Date() } })
		return NextResponse.json({ message: "A verification code was sent to the merchant phone.", phoneVerification: "CODE_SENT" })
	} catch (error: any) {
		return apiErrorResponse(error, "Unable to send phone verification code")
	}
}

export async function PATCH(request: NextRequest) {
	const limited = await rateLimiter(request, "merchant-verification-phone-confirm")
	if (limited) return limited
	try {
		const { context } = await access()
		const parsed = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Enter the six-digit verification code." }, { status: 400 })
		const profile = await prisma.merchantVerificationProfile.findUnique({ where: { tenantId: context.tenantId }, select: { id: true, phoneOtpHash: true, phoneOtpSalt: true, phoneOtpExpiresAt: true, phoneOtpAttempts: true } })
		if (!profile?.phoneOtpHash || !profile.phoneOtpSalt || !profile.phoneOtpExpiresAt || profile.phoneOtpExpiresAt < new Date()) return NextResponse.json({ message: "That verification code has expired. Request a new one." }, { status: 400 })
		if (profile.phoneOtpAttempts >= 5) return NextResponse.json({ message: "Too many incorrect attempts. Request a new code." }, { status: 429 })
		const expected = Buffer.from(profile.phoneOtpHash, "hex")
		const actual = Buffer.from(hashMerchantVerificationOtp(parsed.data.code, profile.phoneOtpSalt), "hex")
		if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
			await prisma.merchantVerificationProfile.update({ where: { id: profile.id }, data: { phoneOtpAttempts: { increment: 1 } } })
			return NextResponse.json({ message: "The verification code is incorrect." }, { status: 400 })
		}
		await prisma.merchantVerificationProfile.update({ where: { id: profile.id }, data: { phoneVerifiedAt: new Date(), phoneOtpHash: null, phoneOtpSalt: null, phoneOtpExpiresAt: null, phoneOtpAttempts: 0 } })
		return NextResponse.json({ message: "Merchant phone verified.", phoneVerification: "VERIFIED" })
	} catch (error: any) {
		return apiErrorResponse(error, "Unable to verify merchant phone")
	}
}
