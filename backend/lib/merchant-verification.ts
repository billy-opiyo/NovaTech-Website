import type { MerchantVerificationStatus } from "@prisma/client"

export type MerchantOnboardingMode = "LIGHT" | "VERIFICATION_REQUIRED"

/** One server-side switch keeps verification policy consistent across routes. */
export function getMerchantOnboardingMode(): MerchantOnboardingMode {
	return process.env.MERCHANT_ONBOARDING_MODE?.trim().toUpperCase() === "VERIFICATION_REQUIRED"
		? "VERIFICATION_REQUIRED"
		: "LIGHT"
}

export function isMerchantVerificationRequired() {
	return getMerchantOnboardingMode() === "VERIFICATION_REQUIRED"
}

export function canMerchantSell(status: MerchantVerificationStatus) {
	return !isMerchantVerificationRequired() || status === "APPROVED"
}

export function merchantVerificationMessage(status: MerchantVerificationStatus) {
	if (status === "PENDING_REVIEW") return "Merchant verification is awaiting Nurava review before the store can sell."
	if (status === "REJECTED") return "Merchant verification needs correction before the store can sell."
	if (status === "SUSPENDED") return "Merchant verification is suspended. Contact Nurava support."
	return "Merchant verification must be approved before the store can sell."
}
