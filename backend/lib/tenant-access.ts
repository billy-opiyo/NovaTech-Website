import { MembershipRole } from "@prisma/client"
import prisma from "./db"
import { hasStorePermission, rolesForPermission, type StorePermission } from "./permissions"

export async function getActiveMembership(userId: string, tenantId: string) {
	if (!userId || !tenantId) return null
	return prisma.membership.findFirst({ where: { userId, tenantId, active: true } })
}

export async function requireMembership(userId: string, tenantId: string, roles?: MembershipRole[]) {
	const membership = await getActiveMembership(userId, tenantId)
	if (!membership || (roles?.length && !roles.includes(membership.role))) {
		const error = new Error("You do not have access to this store")
		Object.assign(error, { status: 403, code: "STORE_ACCESS_DENIED" })
		throw error
	}
	return membership
}

export async function requireStorePermission(userId: string, tenantId: string, permission: StorePermission) {
	const membership = await getActiveMembership(userId, tenantId)
	if (!membership || !hasStorePermission(membership.role, permission)) {
		const error = new Error(`The ${permission.toLowerCase().replace(/_/g, " ")} permission is required`)
		Object.assign(error, { status: 403, code: "STORE_PERMISSION_DENIED", permission })
		throw error
	}
	return membership
}

export const storeManagementRoles: MembershipRole[] = [
	...rolesForPermission("MANAGE_TEAM"),
]

export const storeOperationsRoles: MembershipRole[] = [
	...rolesForPermission("UPDATE_ORDERS"),
]
