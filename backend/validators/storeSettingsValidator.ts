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

const categoryImagesSchema = z.record(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), optionalHttpsOrPath)

export const storeSettingsPatchSchema = z.object({
	name: z.string().trim().min(2).max(120).optional(),
	logoUrl: optionalHttpsOrPath.optional(),
	themePreset: z.string().trim().min(2).max(80).optional(),
	seo: z.object({ title: z.string().trim().max(120).optional(), description: z.string().trim().max(320).optional(), keywords: z.string().trim().max(500).optional() }).strict().optional(),
	contact: z.object({ phoneDisplay: z.string().trim().max(40).optional(), email: z.string().email().optional(), whatsappNumber: z.string().regex(/^\d{10,15}$/).optional(), whatsappFloatingMessage: z.string().trim().max(240).optional(), addressLine: z.string().trim().max(160).optional(), cityCountry: z.string().trim().max(120).optional(), mapLink: optionalHttpsUrl.optional(), mapEmbedUrl: optionalHttpsUrl.optional(), businessHours: z.string().trim().max(120).optional(), responseTime: z.string().trim().max(120).optional(), social: z.object({ facebook: optionalHttpsUrl.optional(), instagram: optionalHttpsUrl.optional(), tiktok: optionalHttpsUrl.optional() }).strict().optional() }).strict().optional(),
	homepage: z.object({ heroTitle: z.string().trim().max(120).optional(), heroHighlight: z.string().trim().max(120).optional(), heroDescription: z.string().trim().max(320).optional(), heroImage: optionalHttpsOrPath.optional(), heroImageAlt: z.string().trim().max(200).optional(), heroPrimaryLabel: z.string().trim().max(80).optional(), heroSecondaryLabel: z.string().trim().max(80).optional(), featuredTitle: z.string().trim().max(120).optional(), bannerTitle: z.string().trim().max(120).optional(), bannerContent: z.string().trim().max(1000).optional(), aboutTitle: z.string().trim().max(120).optional(), aboutDescription: z.string().trim().max(4000).optional(), categoryImages: categoryImagesSchema.optional(), legal: z.object({ terms: z.string().trim().max(12000).optional(), privacy: z.string().trim().max(12000).optional(), cookies: z.string().trim().max(12000).optional() }).strict().optional() }).strict().optional(),
	commerce: z.object({ freeShippingThreshold: z.number().int().min(0).max(100000000).optional(), defaultShippingCost: z.number().int().min(0).max(100000000).optional(), categoryAvailability: z.record(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), z.boolean()) }).partial().strict().optional(),
}).strict()

export type StoreSettingsPatch = z.infer<typeof storeSettingsPatchSchema>
