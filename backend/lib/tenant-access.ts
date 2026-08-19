import { MembershipRole } from "@prisma/client"
import prisma from "./db"

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

export const storeManagementRoles: MembershipRole[] = [
	MembershipRole.STORE_OWNER,
	MembershipRole.STORE_ADMIN,
]

export const storeOperationsRoles: MembershipRole[] = [
	...storeManagementRoles,
	MembershipRole.STORE_MANAGER,
]
