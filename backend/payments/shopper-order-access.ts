import { normalizePhone } from "../lib/daraja"

export type ShopperOrderOwnerRecord = {
	userId: string | null
	shippingAddress: unknown
}

/** Allow a registered owner by session, or a guest by the phone on the order. */
export function canAccessShopperOrder(order: ShopperOrderOwnerRecord, sessionUserId: string | undefined, phone: string) {
	if (order.userId) return order.userId === sessionUserId

	const shippingPhone = (order.shippingAddress as { phone?: unknown } | null)?.phone
	if (typeof shippingPhone !== "string") return false
	try {
		return normalizePhone(shippingPhone) === normalizePhone(phone)
	} catch {
		return false
	}
}
