import { z } from "zod"

const couponCode = z.string().trim().regex(/^[A-Z0-9_-]{3,32}$/i, "Coupon code must be 3-32 letters, numbers, hyphens, or underscores").transform((value) => value.toUpperCase())
const couponDate = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "Expiration date must be valid")
const optionalNonNegative = z.number().finite().min(0).nullable().optional()

export const couponCreateSchema = z.object({
	code: couponCode,
	discountPercent: z.number().finite().positive().max(100).nullable().optional(),
	discountAmount: z.number().finite().positive().nullable().optional(),
	minOrderValue: optionalNonNegative,
	expiresAt: couponDate,
	usageLimit: z.number().int().positive().nullable().optional(),
	isActive: z.boolean().optional(),
}).superRefine((value, context) => {
	if ((value.discountPercent == null) === (value.discountAmount == null)) {
		context.addIssue({ code: z.ZodIssueCode.custom, path: ["discountPercent"], message: "Provide exactly one positive discount value" })
	}
	if (new Date(value.expiresAt) <= new Date()) {
		context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "Expiration date must be in the future" })
	}
})

export const couponUpdateSchema = z.object({
	id: z.string().min(1),
	code: couponCode.optional(),
	expiresAt: couponDate.optional(),
	usageLimit: z.number().int().positive().nullable().optional(),
	isActive: z.boolean().optional(),
}).superRefine((value, context) => {
	if (value.expiresAt && new Date(value.expiresAt) <= new Date()) {
		context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "Expiration date must be in the future" })
	}
})
