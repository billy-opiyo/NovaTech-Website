import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const OWNER_KEY = "nurava-hubstores"
const TENANT_ID = "platform-nurava-hubstores"
const STORE_ID = "nurava-hubstores-store"
const STORE_SLUG = "nurava-marketplace"
const STORE_NAME = "Nurava HubStores"

function requireStagingTarget() {
	if (process.env.PLATFORM_STORE_PROVISION_TARGET !== "saas-staging" || process.env.PLATFORM_STORE_PROVISION_CONFIRM !== "provision-nurava-hubstores") {
		throw new Error("Provisioning requires PLATFORM_STORE_PROVISION_TARGET=saas-staging and PLATFORM_STORE_PROVISION_CONFIRM=provision-nurava-hubstores")
	}
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
}

async function main() {
	requireStagingTarget()
	const result = await prisma.$transaction(async (tx) => {
		let tenant = await tx.tenant.findUnique({ where: { id: TENANT_ID } })
		if (tenant && tenant.kind !== "PLATFORM") throw new Error(`Tenant id ${TENANT_ID} already belongs to a merchant`)
		if (!tenant) tenant = await tx.tenant.create({ data: { id: TENANT_ID, kind: "PLATFORM", legalName: STORE_NAME, status: "ACTIVE" } })

		const possibleStores = await tx.store.findMany({ where: { OR: [{ id: STORE_ID }, { slug: STORE_SLUG }, { platformOwnerKey: OWNER_KEY }] }, select: { id: true, tenantId: true, slug: true, ownerType: true, platformOwnerKey: true, publicationStatus: true } })
		if (possibleStores.some((store) => store.id !== STORE_ID || store.tenantId !== tenant!.id || (store.ownerType === "PLATFORM" && store.platformOwnerKey !== OWNER_KEY))) {
			throw new Error("A store id, slug, or owner identity conflicts with the platform store. No records were changed.")
		}
		let store = possibleStores.find((candidate) => candidate.id === STORE_ID || candidate.platformOwnerKey === OWNER_KEY)
		if (store && (store.ownerType !== "PLATFORM" || store.platformOwnerKey !== OWNER_KEY || store.tenantId !== tenant.id)) throw new Error("The stable platform store identity is already associated with different ownership. No records were changed.")
		if (!store) {
			store = await tx.store.create({ data: { id: STORE_ID, tenantId: tenant.id, ownerType: "PLATFORM", platformOwnerKey: OWNER_KEY, name: STORE_NAME, slug: STORE_SLUG, publicationStatus: "PUBLISHED", publishedAt: new Date(), currency: "KES", country: "KE", timezone: "Africa/Nairobi", defaultLocale: "en-KE" } })
		} else if (store.publicationStatus === "DRAFT") {
			store = await tx.store.update({ where: { id: store.id }, data: { publicationStatus: "PUBLISHED", publishedAt: new Date() } })
		}

		const industries = await tx.industry.findMany({ where: { active: true }, include: { categoryTemplates: { where: { active: true }, orderBy: { displayOrder: "asc" } } }, orderBy: [{ name: "asc" }, { slug: "asc" }] })
		const categoryResult = await tx.category.createMany({
			data: industries.flatMap((industry) => industry.categoryTemplates.map((template) => ({ tenantId: tenant.id, storeId: store!.id, industryId: industry.id, active: true, name: template.name, slug: template.slug, description: template.description, imageUrl: template.imageUrl }))),
			skipDuplicates: true,
		})
		const categoriesCreated = categoryResult.count
		return { tenantId: tenant.id, storeId: store.id, slug: store.slug, publicationStatus: store.publicationStatus, activeIndustries: industries.length, categoriesCreated }
	}, { maxWait: 10_000, timeout: 30_000 })
	console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
	console.error("Platform store provisioning failed:", error instanceof Error ? error.message : error)
	process.exitCode = 1
}).finally(async () => prisma.$disconnect())
