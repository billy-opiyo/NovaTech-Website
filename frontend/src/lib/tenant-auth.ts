import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { MembershipRole } from "@prisma/client"
import { auth } from "./auth"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"

const platformRoles = new Set(["PLATFORM_OWNER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_ANALYST"])

function redirectToAuthGate(reason: "manage" | "platform", callbackUrl: string): never {
	const params = new URLSearchParams({ callbackUrl, gate: "1", portal: reason, reason: "unauthorized" })
	redirect(`/auth/signin?${params.toString()}`)
}

export async function requireStoreSession(roles?: MembershipRole[]) {
	const session = await auth()
	const requestHeaders = await headers()
	const callbackUrl = requestHeaders.get("x-nurava-request-path") || "/manage"
	if (!session?.user?.id) redirectToAuthGate("manage", callbackUrl)

	let context
	try {
		context = await resolveTenantFromRequest({ headers: requestHeaders }, { allowUnpublished: true })
	} catch {
		redirect("/?tenantAccess=unavailable")
	}

	try {
		const membership = await requireMembership(session.user.id, context.tenantId, roles)
		return { session, context, membership }
	} catch {
		redirectToAuthGate("manage", callbackUrl)
	}
}

export async function requirePlatformSession() {
	const session = await auth()
	const requestHeaders = await headers()
	const callbackUrl = requestHeaders.get("x-nurava-request-path") || "/platform"
	if (!session?.user?.id) redirectToAuthGate("platform", callbackUrl)
	if (!platformRoles.has(session.user.platformRole || "") && session.user.role !== "SUPERADMIN") {
		redirectToAuthGate("platform", callbackUrl)
	}
	return session
}
