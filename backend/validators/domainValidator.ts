import { z } from "zod"

export const customDomainSchema = z.object({
	hostname: z.string().trim().toLowerCase().min(4).max(253).regex(/^(?=.{4,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "Enter a valid domain hostname without http:// or a path."),
})

export type CustomDomainInput = z.infer<typeof customDomainSchema>
