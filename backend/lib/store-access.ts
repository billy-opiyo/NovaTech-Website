import { getServerSession } from "@/lib/auth"
import { MembershipRole } from "@prisma/client"
import { resolveTenantFromRequest } from "./tenant"
import { requireMembership } from "./tenant-access"

export async function requireStoreAccess(
	request: { headers: Headers },
	roles: MembershipRole[],
) {
	const session = await getServerSession()
	if (!session?.user?.id) throw Object.assign(new Error("Unauthorized"), { status: 401 })
	const context = await resolveTenantFromRequest(request)
	const membership = await requireMembership(session.user.id, context.tenantId, roles)
	return { session, context, membership }
}
