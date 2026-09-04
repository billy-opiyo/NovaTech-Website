import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { createActionRecord } from "backend/actions"
import { apiErrorResponse } from "backend/lib/api-handler"
import { platformSiteSettingsPatchSchema } from "backend/validators/platformSiteSettingsValidator"
import { getPlatformSiteSettingsDefaults, mergePlatformSiteSettings, type PlatformSiteSettings } from "@/lib/platform-site-settings"

const PLATFORM_SETTINGS_ID = "platform"

function asSettings(value: Prisma.JsonValue | null | undefined): PlatformSiteSettings {
	const parsed = platformSiteSettingsPatchSchema.safeParse(value ?? {})
	return parsed.success ? parsed.data : {}
}

function asJson(value: PlatformSiteSettings): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue
}

async function requireSuperAdmin() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (session.user.role !== "SUPERADMIN") return { response: NextResponse.json({ message: "Super administrator access required" }, { status: 403 }) }
	return { session }
}

export async function GET() {
	const access = await requireSuperAdmin()
	if (access.response) return access.response

	try {
		const row = await prisma.platformSiteSettings.findUnique({
			where: { id: PLATFORM_SETTINGS_ID },
			select: { draftSettings: true, publishedSettings: true, version: true, publishedAt: true },
		})
		const defaults = getPlatformSiteSettingsDefaults()
		const publishedSettings = mergePlatformSiteSettings(defaults, asSettings(row?.publishedSettings))
		const draftSettings = mergePlatformSiteSettings(publishedSettings, asSettings(row?.draftSettings))
		return NextResponse.json({ draftSettings, publishedSettings, version: row?.version ?? 0, publishedAt: row?.publishedAt ?? null })
	} catch (error) {
		return apiErrorResponse(error, "Platform site settings unavailable")
	}
}

export async function PATCH(request: Request) {
	const access = await requireSuperAdmin()
	if (access.response) return access.response

	try {
		const parsed = platformSiteSettingsPatchSchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Invalid platform site settings", issues: parsed.error.flatten() }, { status: 400 })

		const existing = await prisma.platformSiteSettings.findUnique({ where: { id: PLATFORM_SETTINGS_ID }, select: { draftSettings: true, publishedSettings: true } })
		const defaults = getPlatformSiteSettingsDefaults()
		const publishedSettings = mergePlatformSiteSettings(defaults, asSettings(existing?.publishedSettings))
		const currentDraft = existing?.draftSettings ? asSettings(existing.draftSettings) : publishedSettings
		const draftSettings = mergePlatformSiteSettings(currentDraft, parsed.data)
		await prisma.platformSiteSettings.upsert({
			where: { id: PLATFORM_SETTINGS_ID },
			create: { id: PLATFORM_SETTINGS_ID, draftSettings: asJson(draftSettings) },
			update: { draftSettings: asJson(draftSettings) },
		})
		await createActionRecord("UPDATED_PLATFORM_SITE_SETTINGS", { adminId: access.session.user.id }).catch(() => undefined)
		return NextResponse.json({ draftSettings })
	} catch (error) {
		return apiErrorResponse(error, "Platform site settings could not be saved")
	}
}

export async function POST() {
	const access = await requireSuperAdmin()
	if (access.response) return access.response

	try {
		const existing = await prisma.platformSiteSettings.findUnique({ where: { id: PLATFORM_SETTINGS_ID }, select: { draftSettings: true, publishedSettings: true, version: true } })
		if (!existing?.draftSettings) return NextResponse.json({ message: "Save a draft before publishing" }, { status: 400 })
		const parsed = platformSiteSettingsPatchSchema.safeParse(existing.draftSettings)
		if (!parsed.success) return NextResponse.json({ message: "The saved draft is invalid. Save it again before publishing." }, { status: 400 })

		const publishedSettings = mergePlatformSiteSettings(getPlatformSiteSettingsDefaults(), parsed.data)
		const version = existing.version + 1
		const updated = await prisma.platformSiteSettings.update({
			where: { id: PLATFORM_SETTINGS_ID },
			data: { publishedSettings: asJson(publishedSettings), draftSettings: Prisma.DbNull, version, publishedAt: new Date(), publishedBy: access.session.user.id },
			select: { version: true, publishedAt: true },
		})
		await createActionRecord("PUBLISHED_PLATFORM_SITE_SETTINGS", { adminId: access.session.user.id, version }).catch(() => undefined)
		return NextResponse.json({ version: updated.version, publishedAt: updated.publishedAt })
	} catch (error) {
		return apiErrorResponse(error, "Platform site settings could not be published")
	}
}
