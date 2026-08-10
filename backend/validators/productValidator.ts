import { z } from "zod"

export const productSchema = z.object({
	name: z.string().min(3).max(200),
	slug: z
		.string()
		.min(3)
		.max(200)
		.regex(/^[a-z0-9-]+$/),
	description: z.string().min(10),
	brand: z.string().min(1),
	sku: z.string().min(1),
	price: z.number().positive(),
	discountedPrice: z.number().positive().optional(),
	stock: z.number().int().min(0),
	warranty: z.string().optional(),
	specs: z.record(z.string(), z.string()).optional(),
	images: z.array(z.string().url()).min(1),
	categoryId: z.string(),
	isFeatured: z.boolean().optional(),
	isNewArrival: z.boolean().optional(),
	variants: z
		.array(
			z.object({
				name: z.string(),
				value: z.string(),
				priceModifier: z.number().optional(),
				stock: z.number().int().min(0).optional(),
				sku: z.string().optional(),
			}),
		)
		.optional(),
})

export type ProductInput = z.infer<typeof productSchema>
