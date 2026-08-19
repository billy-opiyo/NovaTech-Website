import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { normalizeStoreSlug, storeOnboardingSchema } from "backend/validators/storeValidator"

export async function GET() {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	const memberships = await prisma.membership.findMany({
		where: { userId: session.user.id, active: true },
		select: { role: true, tenant: { select: { id: true, status: true, store: { select: { id: true, name: true, slug: true, publicationStatus: true } } } } },
	})
	return NextResponse.json({ stores: memberships.map(({ role, tenant }) => ({ ...tenant.store, tenantId: tenant.id, tenantStatus: tenant.status, role })) })
}

export async function POST(request: Request) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

	const parsed = storeOnboardingSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid store details", issues: parsed.error.flatten() }, { status: 400 })
	const data = parsed.data
	const slug = data.slug || normalizeStoreSlug(data.name)
	if (slug.length < 3) return NextResponse.json({ message: "Choose a longer store name or slug" }, { status: 400 })
	const platformDomain = (process.env.PLATFORM_DOMAIN || "novatechstore.co.ke").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")

	try {
		const result = await prisma.$transaction(async (transaction) => {
			const plan = await transaction.plan.upsert({ where: { key: "TRIAL" }, update: {}, create: { key: "TRIAL", name: "Trial", currency: data.currency, active: true } })
			const tenant = await transaction.tenant.create({ data: { legalName: data.name, status: "TRIALING", planId: plan.id, trialStartsAt: new Date() } })
			const store = await transaction.store.create({ data: { tenantId: tenant.id, name: data.name, slug, country: data.country, currency: data.currency, timezone: data.timezone, defaultLocale: data.defaultLocale } })
			await transaction.membership.create({ data: { tenantId: tenant.id, userId: session.user.id, role: "STORE_OWNER", active: true, acceptedAt: new Date() } })
			await transaction.subscription.create({ data: { tenantId: tenant.id, planId: plan.id, status: "TRIALING", trialStartsAt: new Date() } })
			await transaction.domain.create({ data: { tenantId: tenant.id, storeId: store.id, hostname: `${slug}.${platformDomain}`, type: "PLATFORM_SUBDOMAIN", verificationToken: `${tenant.id}-platform`, verificationStatus: "PENDING" } })
			return { tenantId: tenant.id, storeId: store.id, slug: store.slug }
		})
		return NextResponse.json(result, { status: 201 })
	} catch (error: any) {
		if (error?.code === "P2002") return NextResponse.json({ message: "That store slug is already in use" }, { status: 409 })
		console.error("Store onboarding failed", error)
		return NextResponse.json({ message: "Unable to create the store" }, { status: 503 })
	}
}
