import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { getLaunchReadiness } from "backend/lib/launch-readiness"
import { getRequestId, logEvent, withRequestId } from "backend/lib/observability"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function GET(request: NextRequest) {
	const requestId = getRequestId(request)
	try {
		const session = await auth()
		if (!session?.user?.id) return withRequestId(NextResponse.json({ message: "Authentication required" }, { status: 401 }), requestId)
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "VIEW_WORKSPACE")
		const readiness = await getLaunchReadiness(context.tenantId, context.storeId)
		return withRequestId(NextResponse.json(readiness), requestId)
	} catch (error: unknown) {
		const details = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {}
		logEvent("error", "merchant_readiness_failed", { requestId, route: "/api/manage/readiness" }, { code: details.code, message: details.message })
		return withRequestId(apiErrorResponse(error, "Launch readiness unavailable"), requestId)
	}
}
