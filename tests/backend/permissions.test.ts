import assert from "node:assert/strict"
import test from "node:test"
import { MembershipRole } from "@prisma/client"
import { hasStorePermission, rolesForPermission } from "../../backend/lib/permissions"

test("store permission matrix grants catalog access to editor but not destructive catalog access", () => {
	assert.equal(hasStorePermission(MembershipRole.STORE_EDITOR, "MANAGE_CATALOG"), true)
	assert.equal(hasStorePermission(MembershipRole.STORE_EDITOR, "DELETE_CATALOG"), false)
})

test("store permission matrix keeps publishing and billing owner/admin only", () => {
	for (const permission of ["PUBLISH_STORE", "MANAGE_BILLING"] as const) {
		assert.deepEqual(rolesForPermission(permission), [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])
		assert.equal(hasStorePermission(MembershipRole.STORE_MANAGER, permission), false)
	}
})

test("store support can handle support and read orders but cannot publish", () => {
	assert.equal(hasStorePermission(MembershipRole.STORE_SUPPORT, "MANAGE_SUPPORT"), true)
	assert.equal(hasStorePermission(MembershipRole.STORE_SUPPORT, "VIEW_ORDERS"), true)
	assert.equal(hasStorePermission(MembershipRole.STORE_SUPPORT, "PUBLISH_STORE"), false)
})
