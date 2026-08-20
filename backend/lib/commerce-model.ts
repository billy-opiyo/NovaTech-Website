/**
 * Nurava Tech is a merchant-direct marketplace: each store is the seller of
 * its products, while Nurava Tech provides discovery, hosting, and merchant
 * SaaS tools. Shopper checkout and shopper payment collection are disabled in
 * this mode so the platform does not present itself as merchant of record.
 */
export const SHOPPER_COMMERCE_MODEL = "MERCHANT_DIRECT" as const

export const SHOPPER_COMMERCE_DISABLED_MESSAGE =
	"This platform connects you with the store. Product purchases and payments are handled directly by the merchant."

export function isShopperCheckoutEnabled() {
	return false
}
