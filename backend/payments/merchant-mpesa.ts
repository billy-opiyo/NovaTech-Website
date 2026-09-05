import prisma from "../lib/db"
import { decryptMerchantPaymentDetails } from "../lib/merchant-verification-secrets"
import { normalizePhone } from "../lib/daraja"

export type MerchantMpesaConfig = {
	consumerKey: string
	consumerSecret: string
	passkey: string
	shortcode: string
	accountType: "PAYBILL" | "TILL"
}

function digits(value: string) {
	return value.replace(/\D/g, "")
}

/** Resolve an active, verified merchant route without exposing its secrets. */
export async function getMerchantMpesaConfig(tenantId: string): Promise<MerchantMpesaConfig | null> {
	const profile = await prisma.merchantShopperPaymentProfile.findUnique({
		where: { tenantId },
		select: {
			accountType: true,
			shortcode: true,
			credentialsCiphertext: true,
			status: true,
			verifiedAt: true,
			tenant: {
				select: {
					verificationStatus: true,
					verificationProfile: { select: { settlementAccountType: true, sensitiveDetailsCiphertext: true } },
				},
			},
		},
	})
	if (!profile || profile.status !== "ACTIVE" || !profile.verifiedAt || profile.tenant.verificationStatus !== "APPROVED") return null
	if (profile.accountType === "OTHER" || profile.tenant.verificationProfile?.settlementAccountType !== profile.accountType) return null

	let verifiedDetails: Record<string, string>
	try {
		verifiedDetails = profile.tenant.verificationProfile
			? decryptMerchantPaymentDetails(profile.tenant.verificationProfile.sensitiveDetailsCiphertext)
			: {}
	} catch {
		return null
	}
	if (digits(verifiedDetails.settlementAccountNumber || "") !== digits(profile.shortcode)) return null

	let credentials: Record<string, string>
	try {
		credentials = decryptMerchantPaymentDetails(profile.credentialsCiphertext)
	} catch {
		return null
	}
	const consumerKey = credentials.consumerKey?.trim()
	const consumerSecret = credentials.consumerSecret?.trim()
	const passkey = credentials.passkey?.trim()
	const shortcode = digits(profile.shortcode)
	if (!consumerKey || !consumerSecret || !passkey || !/^[0-9]{5,10}$/.test(shortcode)) return null

	return { consumerKey, consumerSecret, passkey, shortcode, accountType: profile.accountType }
}

export function normalizeMerchantPaymentPhone(phone: string) {
	return normalizePhone(phone)
}
