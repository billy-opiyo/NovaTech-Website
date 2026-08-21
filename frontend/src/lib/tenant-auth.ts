import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { MembershipRole } from "@prisma/client"
import { auth } from "./auth"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"

const platformRoles = new Set(["PLATFORM_OWNER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_ANALYST"])

export async function requireStoreSession(roles?: MembershipRole[]) {
	const session = await auth()
	if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/manage")

	try {
		const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
		const membership = await requireMembership(session.user.id, context.tenantId, roles)
		return { session, context, membership }
	} catch {
		redirect("/?tenantAccess=unavailable")
	}
}

export async function requirePlatformSession() {
	const session = await auth()
	if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/platform")
	if (!platformRoles.has(session.user.platformRole || "") && session.user.role !== "SUPERADMIN") {
		redirect("/")
	}
	return session
}
