import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { getCurrentMerchantLegalAcceptance, recordMerchantLegalAcceptance } from "backend/lib/legal-acceptance"

export async function POST(request: Request) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "PUBLISH_STORE")
		const body = await request.json().catch(() => null) as { version?: unknown; acceptLegalTerms?: boolean } | null
		const version = Number(body?.version)
		if (!Number.isInteger(version) || version < 1) return NextResponse.json({ message: "A valid published version is required" }, { status: 400 })
		const target = await prisma.storeSettingsVersion.findFirst({ where: { tenantId: context.tenantId, storeId: context.storeId, version }, select: { settings: true } })
		if (!target) return NextResponse.json({ message: "Published version not found" }, { status: 404 })
		const currentAcceptance = await getCurrentMerchantLegalAcceptance(context.tenantId, "SELLING")
		if (!currentAcceptance && body?.acceptLegalTerms !== true) return NextResponse.json({ message: "Confirm the current merchant terms, privacy notice, and merchant responsibilities before publishing.", code: "MERCHANT_LEGAL_ACCEPTANCE_REQUIRED" }, { status: 409 })
		const settings = target.settings && typeof target.settings === "object" && !Array.isArray(target.settings) ? target.settings as Record<string, any> : {}
		const latest = await prisma.storeSettingsVersion.aggregate({ where: { tenantId: context.tenantId, storeId: context.storeId }, _max: { version: true } })
		const nextVersion = (latest._max.version || 0) + 1
		const result = await prisma.$transaction(async (transaction) => {
			if (!currentAcceptance) await recordMerchantLegalAcceptance({ tenantId: context.tenantId, acceptedById: session.user.id, context: "SELLING", transaction })
			const store = await transaction.store.update({ where: { id: context.storeId }, data: { name: typeof settings.name === "string" ? settings.name : undefined, themeSettings: settings.themePreset ? { preset: settings.themePreset } : undefined, seoSettings: settings.seo, contactSettings: settings.contact, homepageSettings: settings.homepage, commerceSettings: settings.commerce, draftSettings: Prisma.DbNull, publicationStatus: "PUBLISHED", publishedAt: new Date() }, select: { id: true, name: true, slug: true, publicationStatus: true, publishedAt: true } })
			await transaction.storeSettingsVersion.create({ data: { tenantId: context.tenantId, storeId: context.storeId, version: nextVersion, settings: target.settings == null ? Prisma.JsonNull : target.settings as Prisma.InputJsonValue, publishedAt: new Date(), publishedBy: session.user.id } })
			return store
		})
		return NextResponse.json({ store: result, version: nextVersion, rolledBackFrom: version })
	} catch (error: any) {
		console.error("Store rollback failed", error)
		return NextResponse.json({ message: error?.status ? error.message : "Store rollback unavailable" }, { status: error?.status || 503 })
	}
}
