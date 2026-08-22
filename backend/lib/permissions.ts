import { MembershipRole } from "@prisma/client"

/**
 * Store permissions are intentionally defined in one place. API handlers may
 * still use requireMembership for compatibility, but new mutations should use
 * requireStorePermission so the role matrix cannot drift between routes.
 */
export const storePermissionRoles = {
	VIEW_WORKSPACE: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT, MembershipRole.STORE_EDITOR],
	MANAGE_STORE_SETTINGS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_EDITOR],
	PUBLISH_STORE: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
	MANAGE_DOMAINS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
	MANAGE_VERIFICATION: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
	MANAGE_TEAM: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
	MANAGE_BILLING: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
	EXPORT_DATA: [MembershipRole.STORE_OWNER],
	MANAGE_CATALOG: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_EDITOR],
	DELETE_CATALOG: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
	VIEW_ORDERS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT],
	UPDATE_ORDERS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER],
	VIEW_CUSTOMERS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT],
	MANAGE_COUPONS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER],
	DELETE_COUPONS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
	MODERATE_REVIEWS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER],
	VIEW_ANALYTICS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER],
	MANAGE_SUPPORT: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT],
	MANAGE_ENQUIRIES: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_SUPPORT],
	CREATE_QUOTES: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
	VIEW_AUDIT_LOGS: [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN],
} as const

export type StorePermission = keyof typeof storePermissionRoles

export function rolesForPermission(permission: StorePermission): MembershipRole[] {
	return [...storePermissionRoles[permission]]
}

export function hasStorePermission(role: MembershipRole, permission: StorePermission) {
	return (storePermissionRoles[permission] as readonly MembershipRole[]).includes(role)
}
