import { getServerSession } from "@/lib/auth"
import { resolveTenantFromRequest } from "./tenant"
import { requireStorePermission } from "./tenant-access"
import type { StorePermission } from "./permissions"

export async function requireStoreAccess(
	request: { headers: Headers },
	permission: StorePermission,
) {
	const session = await getServerSession()
	if (!session?.user?.id) throw Object.assign(new Error("Unauthorized"), { status: 401 })
	const context = await resolveTenantFromRequest(request)
	const membership = await requireStorePermission(session.user.id, context.tenantId, permission)
	return { session, context, membership }
}
