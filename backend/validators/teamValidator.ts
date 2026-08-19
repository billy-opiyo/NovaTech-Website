import { z } from "zod"

export const storeInviteRoles = ["STORE_ADMIN", "STORE_MANAGER", "STORE_SUPPORT", "STORE_EDITOR"] as const

export const storeInvitationSchema = z.object({
	email: z.string().trim().email().transform((value) => value.toLowerCase()),
	role: z.enum(storeInviteRoles),
})

export type StoreInvitationInput = z.infer<typeof storeInvitationSchema>
