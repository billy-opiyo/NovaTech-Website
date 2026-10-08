const DEMO_STORE_SLUGS = new Set(["nurava-furnitures", "nurava-cakes", "nurava-boutiques"])

export const DEMO_STORE_WHATSAPP_NUMBER = "254740470381"

export function resolveStoreWhatsAppNumber(storeSlug: string, configuredNumber: string | null | undefined): string {
	const configured = configuredNumber?.trim()
	if (configured) return configured
	return DEMO_STORE_SLUGS.has(storeSlug) ? DEMO_STORE_WHATSAPP_NUMBER : ""
}
