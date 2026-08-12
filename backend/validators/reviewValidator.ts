import { z } from "zod"

export const reviewSchema = z.object({
	productId: z.string(),
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

export type ReviewInput = z.infer<typeof reviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>