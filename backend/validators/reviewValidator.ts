import { z } from "zod"

export const reviewSchema = z.object({
	productId: z.string().optional(),
	rating: z.number().int().min(1).max(5),
	title: z.string().min(3).max(200).optional(),
	comment: z.string().min(10).max(1000).optional(),
	photos: z.array(z.string().url()).optional(),
})

export const updateReviewSchema = z.object({
	reviewId: z.string(),
	rating: z.number().int().min(1).max(5).optional(),
	title: z.string().min(3).max(200).optional(),
	comment: z.string().min(10).max(1000).optional(),
})

export const deleteReviewSchema = z.object({
	reviewId: z.string(),
})

export const adminReviewUpdateSchema = z.object({
	id: z.string().min(1),
	rating: z.number().int().min(1).max(5),
	title: z.string().trim().min(3).max(200).nullable().optional(),
	comment: z.string().trim().min(10).max(1000),
})

export const adminReviewDeleteSchema = z.object({
	id: z.string().min(1),
})

export type ReviewInput = z.infer<typeof reviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
