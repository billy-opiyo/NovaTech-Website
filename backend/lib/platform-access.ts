import type { Session } from "next-auth"
import prisma from "./db"

export const PLATFORM_OPERATIONS = ["PLATFORM_OPERATIONS", "PLATFORM_OPERATIONS_MANAGE", "PLATFORM_BILLING", "PLATFORM_CONTENT", "PLATFORM_STORE", "PLATFORM_MESSAGES"] as const
export type PlatformOperation = (typeof PLATFORM_OPERATIONS)[number]

const defaultOperationRoles: Record<PlatformOperation, readonly string[]> = {
	PLATFORM_OPERATIONS: ["PLATFORM_OWNER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_ANALYST"],
	PLATFORM_OPERATIONS_MANAGE: ["PLATFORM_OWNER", "PLATFORM_ADMIN"],
	PLATFORM_BILLING: ["PLATFORM_OWNER", "PLATFORM_ADMIN"],
	PLATFORM_CONTENT: ["PLATFORM_OWNER", "PLATFORM_ADMIN"],
	PLATFORM_STORE: ["PLATFORM_OWNER", "PLATFORM_ADMIN"],
	PLATFORM_MESSAGES: ["PLATFORM_OWNER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT"],
}

export async function canAccessPlatformOperation(userId: string, role: string, operation: PlatformOperation): Promise<boolean> {
	if (role === "SUPERADMIN") return true
	const user = await prisma.user.findUnique({ where: { id: userId }, select: { platformRole: true, platformAccessEnabled: true, platformOperationGrants: true } })
	if (!user?.platformAccessEnabled || !user.platformRole) return false
	if (defaultOperationRoles[operation].includes(user.platformRole)) return true
	return Array.isArray(user.platformOperationGrants) && user.platformOperationGrants.includes(operation)
}

export async function hasPlatformOperation(session: Session | null, operation: PlatformOperation): Promise<boolean> {
	if (!session?.user?.id) return false
	return canAccessPlatformOperation(session.user.id, session.user.role || "", operation)
}

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
