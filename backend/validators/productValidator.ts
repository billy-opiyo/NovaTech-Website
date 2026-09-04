import { z } from "zod"

const productFields = {
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
	images: z.array(z.string().refine((value) => /^https?:\/\//i.test(value) || value.startsWith("/"), "images must be absolute URLs or app-relative paths")).min(1),
	categoryId: z.string(),
	isFeatured: z.boolean().optional(),
	isNewArrival: z.boolean().optional(),
	isTrending: z.boolean().optional(),
	variants: z
		.array(
			z.object({
				name: z.string().min(1),
				value: z.string().min(1),
				priceModifier: z.number().finite().optional(),
				stock: z.number().int().min(0).optional(),
				sku: z.string().optional(),
			}),
		)
		.optional(),
} satisfies z.ZodRawShape

export const productSchema = z.object(productFields).superRefine((value, context) => {
	if (value.discountedPrice !== undefined && value.discountedPrice > value.price) {
		context.addIssue({ code: z.ZodIssueCode.custom, path: ["discountedPrice"], message: "discountedPrice cannot exceed price" })
	}
})

export const productUpdateSchema = z.object({
	name: productFields.name.optional(),
	description: productFields.description.optional(),
	brand: productFields.brand.optional(),
	price: productFields.price.optional(),
	discountedPrice: productFields.discountedPrice.nullable().optional(),
	stock: productFields.stock.optional(),
	warranty: productFields.warranty.nullable().optional(),
	specs: productFields.specs.nullable().optional(),
	images: productFields.images.optional(),
	isFeatured: productFields.isFeatured.optional(),
	isNewArrival: productFields.isNewArrival.optional(),
	isTrending: productFields.isTrending.optional(),
	categoryId: productFields.categoryId.optional(),
})

export type ProductInput = z.infer<typeof productSchema>
