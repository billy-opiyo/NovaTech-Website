import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"

const contentSchema = z.object({
	name: z.string().trim().min(2).max(120), logoUrl: z.string().trim().max(2048).optional().or(z.literal("")), heroImage: z.string().trim().max(2048).optional().or(z.literal("")),
	heroTitle: z.string().trim().max(160), heroHighlight: z.string().trim().max(120), heroDescription: z.string().trim().max(1000),
	heroPrimaryLabel: z.string().trim().max(60), featuredTitle: z.string().trim().max(120), categoryTitle: z.string().trim().max(120),
	aboutTitle: z.string().trim().max(120), aboutDescription: z.string().trim().max(2000),
	phoneDisplay: z.string().trim().max(50), email: z.string().trim().email().or(z.literal("")), addressLine: z.string().trim().max(200),
	facebook: z.string().trim().max(300), instagram: z.string().trim().max(300), tiktok: z.string().trim().max(300),
	categoryImages: z.record(z.string().trim().min(1).max(80), z.string().trim().max(2048)).default({}),
}).strict()

async function access() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	const store = await getPlatformStore()
	if (!store || !isPlatformOwnedStore(store)) return { response: NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 }) }
	return { store }
}

export async function GET() {
	const result = await access()
	if ("response" in result) return result.response
	const [store, categories] = await Promise.all([
		prisma.store.findUnique({ where: { id: result.store.id }, select: { name: true, slug: true, logoUrl: true, homepageSettings: true, contactSettings: true } }),
		prisma.category.findMany({ where: { tenantId: result.store.tenantId, storeId: result.store.id, active: true, industry: { is: { active: true } } }, select: { slug: true, name: true, imageUrl: true, industry: { select: { name: true, slug: true } } }, orderBy: [{ industry: { name: "asc" } }, { name: "asc" }] }),
	])
	return NextResponse.json({ store, categories })
}

export async function PATCH(request: Request) {
	const result = await access()
	if ("response" in result) return result.response
	const parsed = contentSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Review the store content fields.", issues: parsed.error.flatten() }, { status: 400 })
	const { name, logoUrl, heroImage, phoneDisplay, email, addressLine, facebook, instagram, tiktok, categoryImages, ...copy } = parsed.data
	const existing = await prisma.store.findUnique({ where: { id: result.store.id }, select: { homepageSettings: true, contactSettings: true } })
	const homepage = existing?.homepageSettings && typeof existing.homepageSettings === "object" && !Array.isArray(existing.homepageSettings) ? existing.homepageSettings as Record<string, unknown> : {}
	const contact = existing?.contactSettings && typeof existing.contactSettings === "object" && !Array.isArray(existing.contactSettings) ? existing.contactSettings as Record<string, unknown> : {}
	const updated = await prisma.store.update({ where: { id: result.store.id }, data: {
		name, logoUrl: logoUrl || null,
		homepageSettings: { ...homepage, ...copy, heroImage: heroImage || null, categoryImages },
		contactSettings: { ...contact, phoneDisplay, email, addressLine, social: { ...(contact.social && typeof contact.social === "object" && !Array.isArray(contact.social) ? contact.social as Record<string, unknown> : {}), facebook, instagram, tiktok } },
	}, select: { name: true, logoUrl: true, homepageSettings: true, contactSettings: true } })
	return NextResponse.json({ store: updated })
}
