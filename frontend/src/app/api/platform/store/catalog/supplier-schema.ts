import { z } from "zod"

export const supplierProductSchema = z.object({
	supplierId: z.string().min(1),
	supplierReference: z.string().trim().min(1).max(120),
	supplierCost: z.number().finite().min(0),
	currency: z.string().trim().length(3).default("KES"),
	availability: z.enum(["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "ON_REQUEST", "DISCONTINUED"]).default("ON_REQUEST"),
	estimatedDeliveryMinDays: z.number().int().min(0).max(365).optional(),
	estimatedDeliveryMaxDays: z.number().int().min(0).max(365).optional(),
	deliveryNotes: z.string().trim().max(1000).optional(),
}).strict().superRefine((value, context) => {
	if (value.estimatedDeliveryMinDays !== undefined && value.estimatedDeliveryMaxDays !== undefined && value.estimatedDeliveryMaxDays < value.estimatedDeliveryMinDays) context.addIssue({ code: z.ZodIssueCode.custom, path: ["estimatedDeliveryMaxDays"], message: "Maximum delivery days must be at least the minimum." })
})
