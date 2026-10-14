import { z } from "zod"

export const cakeCustomizationsSchema = z.object({
	message: z.string().trim().max(50).optional(),
	icing: z.enum(["chocolate-buttercream", "vanilla-buttercream", "whipped-cream", "fondant", "no-preference"]).optional(),
	eventDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	dietaryNotes: z.string().trim().max(300).optional(),
}).strict().refine((value) => Object.values(value).some((item) => typeof item === "string" && item.length > 0), {
	message: "Add at least one cake preference",
})

export type CakeCustomizations = z.infer<typeof cakeCustomizationsSchema>

export function normalizeIndustryCustomizations(industrySlug: string | null | undefined, input: unknown): CakeCustomizations | undefined {
	if (input === undefined || input === null) return undefined
	if (industrySlug !== "cakes") throw new Error("Custom cake options are only available in cake stores")
	const parsed = cakeCustomizationsSchema.safeParse(input)
	if (!parsed.success) throw new Error("Check the cake message, icing, event date, and dietary notes")
	return parsed.data
}
