import type { DefaultSession } from "next-auth"

declare module "next-auth" {
	interface User {
		id: string
		role?: string
		platformRole?: string
	}

	interface Session {
		user: {
			id: string
			role?: string | null
			platformRole?: string | null
		} & DefaultSession["user"]
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		id?: string
		role?: string
		platformRole?: string
	}
}
