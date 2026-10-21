import prisma from "./db"

export const PLATFORM_BRAND_NAME = "Nurava HubStores"
// Keep the platform M-Pesa descriptor aligned with the platform's brand.
export const PLATFORM_MPESA_BUSINESS_NAME = PLATFORM_BRAND_NAME
export const PLATFORM_HELLO_EMAIL = process.env.RESEND_FROM_EMAIL || "hello@nuravahubstores.com"
export const PLATFORM_SUPPORT_EMAIL = "support@nuravahubstores.com"

export async function getPlatformDisplayName(): Promise<string> {
	try {
		const row = await prisma.platformSiteSettings.findUnique({
			where: { id: "platform" },
			select: { publishedSettings: true },
		})
		const settings = row?.publishedSettings
		if (settings && typeof settings === "object" && !Array.isArray(settings)) {
			const brand = (settings as Record<string, unknown>).brand
			if (brand && typeof brand === "object" && !Array.isArray(brand)) {
				const name = (brand as Record<string, unknown>).name
				if (typeof name === "string" && name.trim()) return name.replace(/[\r\n<>\"]/g, "").trim().slice(0, 120)
			}
		}
	} catch {
		// Branding remains available with the configured product default if the
		// settings row is unavailable during startup or a transient DB outage.
	}
	return PLATFORM_BRAND_NAME
}
