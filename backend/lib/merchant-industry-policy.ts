export const APPROVED_MERCHANT_INDUSTRY_SLUGS = ["electronics", "cakes", "furniture", "boutiques"] as const

export function isApprovedMerchantIndustry(slug: string): boolean {
	return (APPROVED_MERCHANT_INDUSTRY_SLUGS as readonly string[]).includes(slug)
}
