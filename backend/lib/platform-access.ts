import type { Session } from "next-auth"

export const PLATFORM_ROLES = ["PLATFORM_OWNER", "PLATFORM_ADMIN"] as const
export type PlatformAdminRole = (typeof PLATFORM_ROLES)[number]

export function isPlatformAdmin(session: Session | null): boolean {
	if (session?.user?.role === "SUPERADMIN") return true
	const role = session?.user?.platformRole
	return typeof role === "string" && PLATFORM_ROLES.includes(role as PlatformAdminRole)
}

const PLATFORM_SUPPORT_ROLES = ["PLATFORM_OWNER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT"] as const

export function hasPlatformSupportAccess(session: Session | null): boolean {
	if (session?.user?.role === "SUPERADMIN") return true
	const role = session?.user?.platformRole
	return typeof role === "string" && PLATFORM_SUPPORT_ROLES.includes(role as (typeof PLATFORM_SUPPORT_ROLES)[number])
}
