import { z } from "zod"

const optionalHttpsUrl = z.string().trim().max(500).refine((value) => {
	if (!value) return true
	try {
		return new URL(value).protocol === "https:"
	} catch {
		return false
	}
}, "Use a valid HTTPS URL")

const optionalHttpsOrPath = z.string().trim().max(500).refine((value) => {
	if (!value) return true
	if (value.startsWith("/") && !value.startsWith("//")) return true
	try {
		return new URL(value).protocol === "https:"
	} catch {
		return false
	}
}, "Use a valid HTTPS URL or app-relative path")

export const storeSettingsPatchSchema = z.object({
	name: z.string().trim().min(2).max(120).optional(),
	logoUrl: optionalHttpsOrPath.optional(),
	themePreset: z.string().trim().min(2).max(80).optional(),
	seo: z.object({ title: z.string().trim().max(120).optional(), description: z.string().trim().max(320).optional(), keywords: z.string().trim().max(500).optional() }).strict().optional(),
	contact: z.object({ phoneDisplay: z.string().trim().max(40).optional(), email: z.string().email().optional(), whatsappNumber: z.string().regex(/^\d{10,15}$/).optional(), whatsappFloatingMessage: z.string().trim().max(240).optional(), addressLine: z.string().trim().max(160).optional(), cityCountry: z.string().trim().max(120).optional(), businessHours: z.string().trim().max(120).optional(), responseTime: z.string().trim().max(120).optional(), social: z.object({ facebook: optionalHttpsUrl.optional(), instagram: optionalHttpsUrl.optional(), tiktok: optionalHttpsUrl.optional() }).strict().optional() }).strict().optional(),
	homepage: z.object({ heroTitle: z.string().trim().max(120).optional(), heroHighlight: z.string().trim().max(120).optional(), heroDescription: z.string().trim().max(320).optional() }).strict().optional(),
	commerce: z.object({ freeShippingThreshold: z.number().int().min(0).max(100000000).optional(), defaultShippingCost: z.number().int().min(0).max(100000000).optional() }).strict().optional(),
}).strict()

export type StoreSettingsPatch = z.infer<typeof storeSettingsPatchSchema>
