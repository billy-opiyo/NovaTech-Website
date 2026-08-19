import { z } from "zod"

export const storeOnboardingSchema = z.object({
	name: z.string().trim().min(2).max(120),
	slug: z.string().trim().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
	country: z.string().trim().length(2).default("KE"),
	currency: z.string().trim().length(3).default("KES"),
	timezone: z.string().trim().min(3).max(80).default("Africa/Nairobi"),
	defaultLocale: z.string().trim().min(2).max(20).default("en-KE"),
})

export function normalizeStoreSlug(name: string) {
	return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63)
}
