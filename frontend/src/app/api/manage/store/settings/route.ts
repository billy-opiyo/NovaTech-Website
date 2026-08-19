import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"
import { storeSettingsPatchSchema } from "backend/validators/storeSettingsValidator"
import { THEME_PRESETS } from "@/config/theme-presets"

async function storeAccess() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	const context = await resolveTenantFromRequest({ headers: await headers() })
	const membership = await requireMembership(session.user.id, context.tenantId)
	return { session, context, membership }
}

export async function GET() {
	try {
		const access = await storeAccess()
		if ("response" in access) return access.response
		const store = await prisma.store.findFirst({ where: { id: access.context.storeId, tenantId: access.context.tenantId }, select: { id: true, tenantId: true, name: true, slug: true, publicationStatus: true, themeSettings: true, seoSettings: true, contactSettings: true, homepageSettings: true, commerceSettings: true, draftSettings: true } })
		if (!store) return NextResponse.json({ message: "Store not found" }, { status: 404 })
		const versions = await prisma.storeSettingsVersion.findMany({ where: { tenantId: access.context.tenantId, storeId: access.context.storeId }, select: { version: true, publishedAt: true, publishedBy: true, createdAt: true }, orderBy: { version: "desc" }, take: 20 })
		return NextResponse.json({ store, versions })
	} catch (error) {
		console.error("Store settings read failed", error)
		return NextResponse.json({ message: "Store settings unavailable" }, { status: 503 })
	}
}

export async function PATCH(request: Request) {
	try {
		const access = await storeAccess()
		if ("response" in access) return access.response
		const data = storeSettingsPatchSchema.safeParse(await request.json().catch(() => null))
		if (!data.success) return NextResponse.json({ message: "Invalid store settings", issues: data.error.flatten() }, { status: 400 })
		if (data.data.themePreset && !(data.data.themePreset in THEME_PRESETS)) return NextResponse.json({ message: "That theme preset is not approved" }, { status: 400 })
		if (!["STORE_OWNER", "STORE_ADMIN", "STORE_EDITOR"].includes(access.membership.role)) return NextResponse.json({ message: "You cannot edit store settings" }, { status: 403 })
		const store = await prisma.store.findFirst({ where: { id: access.context.storeId, tenantId: access.context.tenantId }, select: { id: true, draftSettings: true } })
		if (!store) return NextResponse.json({ message: "Store not found" }, { status: 404 })
		const draft = { ...(store.draftSettings && typeof store.draftSettings === "object" && !Array.isArray(store.draftSettings) ? store.draftSettings as Record<string, unknown> : {}), ...data.data }
		await prisma.store.update({ where: { id: store.id }, data: { draftSettings: draft } })
		return NextResponse.json({ draftSettings: draft })
	} catch (error) {
		console.error("Store settings update failed", error)
		return NextResponse.json({ message: "Store settings unavailable" }, { status: 503 })
	}
}
