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
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color, such as #0070f3").optional()
const designModeColorsSchema = z.object({
	background: hexColor,
	surface: hexColor,
	text: hexColor,
	muted: hexColor,
	border: hexColor,
}).strict()
const platformDesignSchema = z.object({
	themePreset: z.string().trim().max(80).optional(),
	colors: z.object({
		primary: hexColor,
		primaryDark: hexColor,
		accent: hexColor,
		light: designModeColorsSchema.optional(),
		dark: designModeColorsSchema.optional(),
	}).strict().optional(),
	typography: z.object({
		bodyFont: z.enum(["system", "inter", "georgia", "trebuchet", "verdana"]).optional(),
		headingFont: z.enum(["system", "inter", "georgia", "trebuchet", "verdana"]).optional(),
		fontSize: z.enum(["small", "normal", "large", "extraLarge"]).optional(),
	}).strict().optional(),
	glass: z.object({
		blurPx: z.number().int().min(0).max(32).optional(),
		cardRadiusPx: z.number().int().min(0).max(32).optional(),
		lightOpacity: z.number().int().min(0).max(100).optional(),
		darkOpacity: z.number().int().min(0).max(100).optional(),
		lightBorderOpacity: z.number().int().min(0).max(100).optional(),
		darkBorderOpacity: z.number().int().min(0).max(100).optional(),
		shadow: z.enum(["none", "soft", "balanced", "bold"]).optional(),
	}).strict().optional(),
}).strict()

const responsiveAssetsSchema = z.object({
	darkDesktop: optionalHttpsOrPath.optional(),
	darkTablet: optionalHttpsOrPath.optional(),
	darkMobile: optionalHttpsOrPath.optional(),
	lightDesktop: optionalHttpsOrPath.optional(),
	lightTablet: optionalHttpsOrPath.optional(),
	lightMobile: optionalHttpsOrPath.optional(),
}).strict()

const teamMemberSchema = z.object({
	id: z.string().trim().min(1).max(80),
	name: z.string().trim().min(1).max(120),
	role: z.string().trim().min(1).max(120),
	bio: z.string().trim().max(600),
	image: optionalHttpsOrPath.optional(),
	social: z.object({
		linkedin: optionalHttpsOrPath.optional(),
		instagram: optionalHttpsOrPath.optional(),
		x: optionalHttpsOrPath.optional(),
		github: optionalHttpsOrPath.optional(),
	}).strict().optional(),
}).strict()

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
	splash: z.object({
		enabled: z.boolean().optional(),
		showProgress: z.boolean().optional(),
		welcomeText: optionalText(120),
		loadingText: optionalText(120),
		backgroundMode: z.enum(["images", "color", "glass"]).optional(),
		backgroundColor: hexColor,
		centerContentOnColor: z.boolean().optional(),
		glassOpacity: z.number().int().min(0).max(100).optional(),
		images: responsiveAssetsSchema.optional(),
	}).strict().optional(),
	hero: z.object({
		title: optionalText(180),
		highlight: optionalText(120),
		description: optionalText(320),
		// Legacy saved artwork remains parseable for compatibility; merge strips it.
		images: responsiveAssetsSchema.optional(),
	}).strict().optional(),
	discoveryCards: z.object({
		businesses: z.object({ title: optionalText(120), text: optionalText(240) }).strict().optional(),
		customers: z.object({ title: optionalText(120), text: optionalText(240) }).strict().optional(),
		compare: z.object({ title: optionalText(120), text: optionalText(240) }).strict().optional(),
		choose: z.object({ title: optionalText(120), text: optionalText(240) }).strict().optional(),
		buyFromStore: z.object({ title: optionalText(120), text: optionalText(240) }).strict().optional(),
	}).strict().optional(),
	design: platformDesignSchema.optional(),
	legal: z.object({
		terms: optionalText(12000),
		privacy: optionalText(12000),
		cookies: optionalText(12000),
	}).strict().optional(),
	team: z.array(teamMemberSchema).max(12).optional(),
}).strict()

export type PlatformSiteSettingsPatch = z.infer<typeof platformSiteSettingsPatchSchema>
