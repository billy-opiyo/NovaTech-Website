import { z } from "zod"

const optionalHttpsOrPath = z.string().trim().max(500).refine((value) => {
	if (!value) return true
	if (value.startsWith("/")) return true
	try {
		return new URL(value).protocol === "https:"
	} catch {
		return false
	}
}, "Use a valid HTTPS URL or app-relative path")

const optionalText = (max: number) => z.string().trim().max(max).optional()

export const platformSiteSettingsPatchSchema = z.object({
	brand: z.object({
		name: optionalText(120),
		tagline: optionalText(180),
		logo: optionalHttpsOrPath.optional(),
		logoAlt: optionalText(160),
		favicon: optionalHttpsOrPath.optional(),
	}).strict().optional(),
	site: z.object({ footerDescription: optionalText(320) }).strict().optional(),
	contact: z.object({
		phoneDisplay: optionalText(40),
		email: z.string().trim().email().max(160).optional(),
		whatsappNumber: z.string().trim().regex(/^\d{10,15}$/).optional(),
		whatsappFloatingMessage: optionalText(240),
		whatsappMessage: optionalText(240),
		addressLine: optionalText(160),
		cityCountry: optionalText(120),
		businessHours: optionalText(120),
		responseTime: optionalText(120),
	}).strict().optional(),
	social: z.object({
		facebook: optionalHttpsOrPath.optional(),
		instagram: optionalHttpsOrPath.optional(),
		tiktok: optionalHttpsOrPath.optional(),
		linkedin: optionalHttpsOrPath.optional(),
		youtube: optionalHttpsOrPath.optional(),
		x: optionalHttpsOrPath.optional(),
	}).strict().optional(),
	seo: z.object({
		title: optionalText(120),
		description: optionalText(320),
		keywords: optionalText(500),
		ogImage: optionalHttpsOrPath.optional(),
	}).strict().optional(),
	features: z.object({
		showWhatsAppButton: z.boolean().optional(),
		showWhatsAppContact: z.boolean().optional(),
		showSocialLinks: z.boolean().optional(),
		showContactCards: z.boolean().optional(),
	}).strict().optional(),
}).strict()

export type PlatformSiteSettingsPatch = z.infer<typeof platformSiteSettingsPatchSchema>
