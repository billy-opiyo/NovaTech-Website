import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { normalizeStoreSlug, storeOnboardingSchema } from "backend/validators/storeValidator"
import { getPlatformDomain } from "backend/lib/platform-domain"
import { recordMerchantLegalAcceptance } from "backend/lib/legal-acceptance"
import { DEFAULT_STORE_CATEGORIES } from "backend/lib/default-categories"
import { pilotTrialEndsAt } from "backend/billing/mvp-policy"
import { defaultCategoryImage, defaultIndustryHomepage } from "backend/lib/industry-content"

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
	const platformDomain = getPlatformDomain()

	try {
		const result = await prisma.$transaction(async (transaction) => {
			const industry = await transaction.industry.findUnique({
				where: { slug: data.industrySlug },
				include: {
				categoryTemplates: { where: { active: true }, orderBy: { displayOrder: "asc" } },
					attributeDefinitions: { where: { active: true }, orderBy: { displayOrder: "asc" } },
					storeTypes: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 },
					defaultTheme: true,
				},
			})
			if (!industry?.active) throw Object.assign(new Error("Choose an active industry."), { code: "INDUSTRY_NOT_FOUND" })
			const plan = await transaction.plan.findFirst({ where: { key: data.planKey, active: true } })
			if (!plan || plan.price == null || plan.billingInterval !== "MONTH") throw Object.assign(new Error("Choose an active monthly plan."), { code: "PLAN_NOT_FOUND" })
			const setupFeePaid = plan.setupFeeAmount <= 0
			const trialStartsAt = setupFeePaid ? new Date() : null
			const trialEndsAt = trialStartsAt ? pilotTrialEndsAt(trialStartsAt) : null
			const tenant = await transaction.tenant.create({ data: { legalName: data.name, status: "TRIALING", planId: plan.id, trialStartsAt: trialStartsAt || undefined, trialEndsAt: trialEndsAt || undefined } })
			const categoryCards = industry.categoryTemplates.map((category) => ({ name: category.name, slug: category.slug, image: defaultCategoryImage(industry.slug, category.name, category.imageUrl) }))
			const homepage = {
				...defaultIndustryHomepage(industry, industry.homepagePreset),
				categories: categoryCards,
			}
			const store = await transaction.store.create({ data: {
				tenantId: tenant.id,
				industryId: industry.id,
				storeTypeId: industry.storeTypes[0]?.id,
				name: data.name,
				slug,
				country: data.country,
				currency: data.currency,
				timezone: data.timezone,
				defaultLocale: data.defaultLocale,
				seoSettings: { description: industry.description || `Shop quality ${industry.name.toLowerCase()} products from ${data.name}.`, keywords: `${industry.name}, online shopping, Kenya` },
				themeSettings: industry.defaultTheme ? {
					themeId: industry.defaultTheme.id,
					themeSlug: industry.defaultTheme.slug,
					preset: "nova-blue-orange",
					themeSnapshot: { colors: industry.defaultTheme.colors, typography: industry.defaultTheme.typography, heroLayout: industry.defaultTheme.heroLayout, bannerStyle: industry.defaultTheme.bannerStyle, productGridStyle: industry.defaultTheme.productGridStyle },
				} : undefined,
				homepageSettings: homepage,
			} })
			await transaction.membership.create({ data: { tenantId: tenant.id, userId: session.user.id, role: "STORE_OWNER", active: true, acceptedAt: new Date() } })
			await transaction.category.createMany({ data: industry.categoryTemplates.length
				? industry.categoryTemplates.map((category) => ({ tenantId: tenant.id, storeId: store.id, name: category.name, slug: category.slug, description: category.description, imageUrl: category.imageUrl }))
				: (industry.slug === "electronics" ? DEFAULT_STORE_CATEGORIES : []).map((category) => ({ tenantId: tenant.id, storeId: store.id, ...category })) })
			await recordMerchantLegalAcceptance({ tenantId: tenant.id, acceptedById: session.user.id, context: "TRIAL_START", transaction })
			await transaction.subscription.create({ data: { tenantId: tenant.id, planId: plan.id, status: setupFeePaid ? "TRIALING" : "INCOMPLETE", trialStartsAt: trialStartsAt || undefined, trialEndsAt: trialEndsAt || undefined } })
			await transaction.billingCustomer.create({ data: { tenantId: tenant.id, ownerUserId: session.user.id } })
			await transaction.billingRecord.create({ data: { tenantId: tenant.id, ownerUserId: session.user.id, setupFeeAmount: plan.setupFeeAmount, currency: plan.currency, setupFeeStatus: setupFeePaid ? "PAID" : "PENDING", setupFeePaidAt: setupFeePaid ? new Date() : undefined } })
			await transaction.domain.create({ data: { tenantId: tenant.id, storeId: store.id, hostname: `${slug}.${platformDomain}`, type: "PLATFORM_SUBDOMAIN", verificationToken: `${tenant.id}-platform`, verificationStatus: "PENDING" } })
			return { tenantId: tenant.id, storeId: store.id, slug: store.slug, industry: { id: industry.id, name: industry.name, slug: industry.slug }, setupFeeRequired: !setupFeePaid, setupFeeAmount: plan.setupFeeAmount, currency: plan.currency, planName: plan.name }
		})
		return NextResponse.json(result, { status: 201 })
	} catch (error: unknown) {
		const code = error && typeof error === "object" && "code" in error ? error.code : undefined
		if (code === "P2002") return NextResponse.json({ message: "That store slug is already in use" }, { status: 409 })
		if (code === "PLAN_NOT_FOUND") return NextResponse.json({ message: "The selected plan is unavailable" }, { status: 409 })
		if (code === "INDUSTRY_NOT_FOUND") return NextResponse.json({ message: "The selected industry is unavailable" }, { status: 409 })
		console.error("Store onboarding failed", error)
		return NextResponse.json({ message: "Unable to create the store" }, { status: 503 })
	}
}
