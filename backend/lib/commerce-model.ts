/**
 * Nurava Tech is a merchant-direct marketplace: each store is the seller of
 * its products, while Nurava Tech provides discovery, hosting, and merchant
 * SaaS tools. Shopper checkout is opt-in through MERCHANT_ROUTED mode and
 * still keeps the merchant as merchant of record.
 */
export const SHOPPER_COMMERCE_MODEL = (process.env.SHOPPER_COMMERCE_MODEL || "MERCHANT_DIRECT") as "MERCHANT_DIRECT" | "MERCHANT_ROUTED"

export const SHOPPER_COMMERCE_DISABLED_MESSAGE =
	"Online payment is not enabled for this store yet. Please contact the merchant directly."

export const SHOPPER_COMMERCE_ZERO_COMMISSION = true

export function isShopperCheckoutEnabled() {
	return SHOPPER_COMMERCE_MODEL === "MERCHANT_ROUTED"
}
