import { z } from "zod"

export const registerSchema = z.object({
	name: z.string().min(2).max(100),
	email: z.string().email(),
	password: z.string().min(8).max(100),
	callbackUrl: z.string().refine((value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"), "Invalid callback URL").optional(),
})

export const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
