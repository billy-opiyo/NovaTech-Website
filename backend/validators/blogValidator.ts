import { z } from "zod"

const imageUrl = z.string().trim().max(2048).optional().nullable().transform((value) => value || null).refine((value) => {
	if (!value) return true
	if (value.startsWith("/")) return !value.startsWith("//")
	try { return ["http:", "https:"].includes(new URL(value).protocol) } catch { return false }
}, "Use a relative image path or an HTTP(S) image URL")

export const blogPostCreateSchema = z.object({
	title: z.string().trim().min(3).max(160),
	slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
	excerpt: z.string().trim().min(10).max(500),
	content: z.string().trim().min(20).max(30000),
	coverImageUrl: imageUrl,
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
})

export const blogPostUpdateSchema = blogPostCreateSchema.partial()
