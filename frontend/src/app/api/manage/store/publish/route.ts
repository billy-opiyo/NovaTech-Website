import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { merchantVerificationMessage } from "backend/lib/merchant-verification"
import { getCurrentMerchantLegalAcceptance, recordMerchantLegalAcceptance } from "backend/lib/legal-acceptance"
import { getLaunchReadiness } from "backend/lib/launch-readiness"
import { getRequestId, logEvent, withRequestId } from "backend/lib/observability"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function POST(request: Request) {
	const requestId = getRequestId(request)
	try {
		const session = await auth()
		if (!session?.user?.id) return withRequestId(NextResponse.json({ message: "Authentication required" }, { status: 401 }), requestId)
		const body = await request.json().catch(() => ({})) as { acceptLegalTerms?: boolean }
		const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "PUBLISH_STORE")
		const store = await prisma.store.findFirst({ where: { id: context.storeId, tenantId: context.tenantId }, select: { id: true, tenantId: true, draftSettings: true, tenant: { select: { verificationStatus: true } } } })
		if (!store) return withRequestId(NextResponse.json({ message: "Store not found" }, { status: 404 }), requestId)
		const readiness = await getLaunchReadiness(context.tenantId, context.storeId, { legalAcceptanceOverride: body.acceptLegalTerms === true })
		if (!readiness.ready) return withRequestId(NextResponse.json({ message: "Complete the launch readiness checks before publishing.", code: "LAUNCH_READINESS_INCOMPLETE", checks: readiness.checks, requestId }, { status: 409 }), requestId)
		if (store.tenant.verificationStatus !== "APPROVED") return NextResponse.json({ message: merchantVerificationMessage(store.tenant.verificationStatus), code: "MERCHANT_VERIFICATION_REQUIRED", verificationStatus: store.tenant.verificationStatus }, { status: 409 })
		const currentAcceptance = await getCurrentMerchantLegalAcceptance(context.tenantId, "SELLING")
		if (!currentAcceptance && body.acceptLegalTerms !== true) return NextResponse.json({ message: "Confirm the current merchant terms, privacy notice, and merchant responsibilities before publishing.", code: "MERCHANT_LEGAL_ACCEPTANCE_REQUIRED" }, { status: 409 })
		if (!store.draftSettings || typeof store.draftSettings !== "object" || Array.isArray(store.draftSettings)) return NextResponse.json({ message: "Save a draft before publishing" }, { status: 400 })
		const draft = store.draftSettings as Record<string, any>
		const latest = await prisma.storeSettingsVersion.findFirst({ where: { storeId: store.id, tenantId: store.tenantId }, orderBy: { version: "desc" }, select: { version: true } })
		const nextVersion = (latest?.version || 0) + 1
		const updated = await prisma.$transaction(async (transaction) => {
			if (!currentAcceptance) await recordMerchantLegalAcceptance({ tenantId: context.tenantId, acceptedById: session.user.id, context: "SELLING", transaction })
			const result = await transaction.store.update({ where: { id: store.id }, data: { name: typeof draft.name === "string" ? draft.name : undefined, themeSettings: draft.themePreset ? { preset: draft.themePreset } : undefined, seoSettings: draft.seo, contactSettings: draft.contact, homepageSettings: draft.homepage, commerceSettings: draft.commerce, draftSettings: Prisma.DbNull, publicationStatus: "PUBLISHED", publishedAt: new Date() }, select: { id: true, name: true, slug: true, publicationStatus: true, publishedAt: true } })
			await transaction.storeSettingsVersion.create({ data: { tenantId: store.tenantId, storeId: store.id, version: nextVersion, settings: draft, publishedAt: new Date(), publishedBy: session.user.id } })
			return result
		})
		logEvent("info", "store_published", { requestId, tenantId: context.tenantId, actorId: session.user.id, route: "/api/manage/store/publish" }, { storeId: context.storeId, version: nextVersion })
		return withRequestId(NextResponse.json({ store: updated, version: nextVersion, requestId }), requestId)
	} catch (error) {
		logEvent("error", "store_publish_failed", { requestId, route: "/api/manage/store/publish" }, { message: error })
		return withRequestId(apiErrorResponse(error, "Store could not be published"), requestId)
	}
}
