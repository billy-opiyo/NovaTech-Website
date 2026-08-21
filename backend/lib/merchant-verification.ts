import type { MerchantVerificationStatus } from "@prisma/client"

export function canMerchantSell(status: MerchantVerificationStatus) {
	return status === "APPROVED"
}

export function merchantVerificationMessage(status: MerchantVerificationStatus) {
	if (status === "PENDING_REVIEW") return "Merchant verification is awaiting Nurava review before the store can sell."
	if (status === "REJECTED") return "Merchant verification needs correction before the store can sell."
	if (status === "SUSPENDED") return "Merchant verification is suspended. Contact Nurava support."
	return "Merchant verification must be approved before the store can sell."
}
