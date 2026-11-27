import prisma from "backend/lib/db"
import { revalidateTenantInventory } from "./public-catalog.server"

/** Invalidate public stock and sales recommendations after an order payment changes state. */
export async function revalidateOrderPaymentCache(provider: string, providerReference: string | null | undefined) {
	if (!providerReference) return
	try {
		const payment = await prisma.payment.findFirst({
			where: { provider, providerReference, status: { in: ["COMPLETED", "REFUNDED"] }, kind: "ORDER" },
			select: { tenantId: true, storeId: true },
		})
		if (payment?.tenantId && payment.storeId) revalidateTenantInventory({ tenantId: payment.tenantId, storeId: payment.storeId })
	} catch (error: unknown) {
		// Payment processing remains authoritative; the short public cache TTL is the fallback.
		console.error("Order payment cache invalidation failed", error)
	}
}
