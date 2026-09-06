import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { z } from "zod"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { decryptMerchantPaymentDetails, decryptMerchantVerificationDetails, encryptMerchantPaymentDetails } from "backend/lib/merchant-verification-secrets"
import { apiErrorResponse } from "backend/lib/api-handler"
import { getNuravaShopperPaymentTestConfig } from "backend/lib/shopper-payment-test-mode"

const paymentProfileSchema = z.object({
	accountType: z.enum(["PAYBILL", "TILL"]),
	shortcode: z.string().trim().regex(/^\d{5,10}$/, "Enter the merchant Paybill or Till number."),
	consumerKey: z.string().trim().min(8).max(300).optional(),
	consumerSecret: z.string().trim().min(8).max(300).optional(),
	passkey: z.string().trim().min(8).max(300).optional(),
}).strict()

async function access() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
	const membership = await requireStorePermission(session.user.id, context.tenantId, "MANAGE_STORE_SETTINGS")
	if (!["STORE_OWNER", "STORE_ADMIN"].includes(membership.role)) return { response: NextResponse.json({ message: "Only the store owner or administrator can manage payment credentials." }, { status: 403 }) }
	return { context }
}

export async function GET() {
	try {
		const current = await access()
		if ("response" in current) return current.response
		const testConfig = getNuravaShopperPaymentTestConfig(current.context.storeSlug)
		const profile = await prisma.merchantShopperPaymentProfile.findUnique({ where: { tenantId: current.context.tenantId }, select: { accountType: true, shortcode: true, status: true, verifiedAt: true, credentialsCiphertext: true } })
		return NextResponse.json({ testMode: Boolean(testConfig), profile: profile ? { accountType: profile.accountType, shortcode: profile.shortcode, status: profile.status, verifiedAt: profile.verifiedAt, credentialsConfigured: Boolean(profile.credentialsCiphertext) } : testConfig ? { accountType: testConfig.accountType, shortcode: testConfig.shortcode, status: "ACTIVE", verifiedAt: new Date(), credentialsConfigured: true } : null })
	} catch (error) {
		return apiErrorResponse(error, "Shopper payment settings unavailable")
	}
}

export async function PATCH(request: Request) {
	try {
		const current = await access()
		if ("response" in current) return current.response
		const parsed = paymentProfileSchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Enter a valid merchant M-Pesa route and credentials.", issues: parsed.error.flatten() }, { status: 400 })
		const testConfig = getNuravaShopperPaymentTestConfig(current.context.storeSlug)
		if (testConfig) {
			const shortcode = parsed.data.shortcode.replace(/\D/g, "")
			if (parsed.data.accountType !== testConfig.accountType || shortcode !== testConfig.shortcode) return NextResponse.json({ message: "Use the configured staging sandbox Paybill route for the Nurava Tech test store." }, { status: 409 })
			for (const [name, value, expected] of [["consumer key", parsed.data.consumerKey, testConfig.consumerKey], ["consumer secret", parsed.data.consumerSecret, testConfig.consumerSecret], ["STK passkey", parsed.data.passkey, testConfig.passkey]] as const) {
				if (value && value !== expected) return NextResponse.json({ message: `The ${name} must match the staging sandbox environment value.` }, { status: 400 })
			}
			return NextResponse.json({ message: "Nurava Tech staging sandbox payment route is active. Credentials are being read from the staging environment.", testMode: true, profile: { accountType: testConfig.accountType, shortcode: testConfig.shortcode, status: "ACTIVE", verifiedAt: new Date(), credentialsConfigured: true } })
		}

		const tenant = await prisma.tenant.findUnique({ where: { id: current.context.tenantId }, select: { verificationStatus: true, verificationProfile: { select: { settlementAccountType: true, sensitiveDetailsCiphertext: true } } } })
		if (!tenant?.verificationProfile) return NextResponse.json({ message: "Complete merchant verification before configuring shopper payments." }, { status: 409 })
		let verificationDetails: Record<string, string>
		try { verificationDetails = decryptMerchantVerificationDetails(tenant.verificationProfile.sensitiveDetailsCiphertext) } catch { return NextResponse.json({ message: "Merchant verification data is unavailable. Contact platform support." }, { status: 503 }) }
		const verifiedNumber = (verificationDetails.settlementAccountNumber || "").replace(/\D/g, "")
		if (tenant.verificationProfile.settlementAccountType !== parsed.data.accountType || verifiedNumber !== parsed.data.shortcode) return NextResponse.json({ message: "The shopper payment route must match the verified merchant M-Pesa account." }, { status: 409 })

		const existing = await prisma.merchantShopperPaymentProfile.findUnique({ where: { tenantId: current.context.tenantId }, select: { credentialsCiphertext: true } })
		let credentials = { consumerKey: parsed.data.consumerKey, consumerSecret: parsed.data.consumerSecret, passkey: parsed.data.passkey }
		if (existing && (!credentials.consumerKey || !credentials.consumerSecret || !credentials.passkey)) {
			try {
				const previous = decryptMerchantPaymentDetails(existing.credentialsCiphertext)
				credentials = { consumerKey: credentials.consumerKey || previous.consumerKey, consumerSecret: credentials.consumerSecret || previous.consumerSecret, passkey: credentials.passkey || previous.passkey }
			} catch { return NextResponse.json({ message: "Enter all M-Pesa credentials when replacing the payment route." }, { status: 400 }) }
		}
		if (!credentials.consumerKey || !credentials.consumerSecret || !credentials.passkey) return NextResponse.json({ message: "Consumer key, consumer secret, and passkey are required." }, { status: 400 })
		const completeCredentials: Record<string, string> = { consumerKey: credentials.consumerKey, consumerSecret: credentials.consumerSecret, passkey: credentials.passkey }

		const approved = tenant.verificationStatus === "APPROVED"
		const profile = await prisma.merchantShopperPaymentProfile.upsert({
			where: { tenantId: current.context.tenantId },
			create: { tenantId: current.context.tenantId, accountType: parsed.data.accountType, shortcode: parsed.data.shortcode, credentialsCiphertext: encryptMerchantPaymentDetails(completeCredentials), status: approved ? "ACTIVE" : "PENDING", verifiedAt: approved ? new Date() : null },
			update: { accountType: parsed.data.accountType, shortcode: parsed.data.shortcode, credentialsCiphertext: encryptMerchantPaymentDetails(completeCredentials), status: approved ? "ACTIVE" : "PENDING", verifiedAt: approved ? new Date() : null },
			select: { accountType: true, shortcode: true, status: true, verifiedAt: true },
		})
		return NextResponse.json({ message: approved ? "Shopper M-Pesa payments enabled for this store." : "Payment details saved and will activate after merchant verification approval.", profile })
	} catch (error) {
		return apiErrorResponse(error, "Unable to save shopper payment settings")
	}
}
