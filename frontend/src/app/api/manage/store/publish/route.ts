import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"

export async function POST() {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest({ headers: await headers() })
		const membership = await requireMembership(session.user.id, context.tenantId, ["STORE_OWNER", "STORE_ADMIN"])
		void membership
		const store = await prisma.store.findFirst({ where: { id: context.storeId, tenantId: context.tenantId }, select: { id: true, tenantId: true, draftSettings: true } })
		if (!store) return NextResponse.json({ message: "Store not found" }, { status: 404 })
		if (!store.draftSettings || typeof store.draftSettings !== "object" || Array.isArray(store.draftSettings)) return NextResponse.json({ message: "Save a draft before publishing" }, { status: 400 })
		const draft = store.draftSettings as Record<string, any>
		const latest = await prisma.storeSettingsVersion.findFirst({ where: { storeId: store.id, tenantId: store.tenantId }, orderBy: { version: "desc" }, select: { version: true } })
		const nextVersion = (latest?.version || 0) + 1
		const updated = await prisma.$transaction(async (transaction) => {
			const result = await transaction.store.update({ where: { id: store.id }, data: { name: typeof draft.name === "string" ? draft.name : undefined, themeSettings: draft.themePreset ? { preset: draft.themePreset } : undefined, seoSettings: draft.seo, contactSettings: draft.contact, homepageSettings: draft.homepage, commerceSettings: draft.commerce, draftSettings: Prisma.DbNull, publicationStatus: "PUBLISHED", publishedAt: new Date() }, select: { id: true, name: true, slug: true, publicationStatus: true, publishedAt: true } })
			await transaction.storeSettingsVersion.create({ data: { tenantId: store.tenantId, storeId: store.id, version: nextVersion, settings: draft, publishedAt: new Date(), publishedBy: session.user.id } })
			return result
		})
		return NextResponse.json({ store: updated, version: nextVersion })
	} catch (error) {
		console.error("Store publish failed", error)
		return NextResponse.json({ message: "Store could not be published" }, { status: 503 })
	}
}
