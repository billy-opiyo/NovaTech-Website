import prisma from "./db"
import { PLATFORM_STORE_OWNER_KEY } from "./platform-store"

/** Reflect active industry category presets into the owned catalog without creating products. */
export async function syncPlatformStoreIndustryCategories(industryId: string) {
	const store = await prisma.store.findUnique({ where: { platformOwnerKey: PLATFORM_STORE_OWNER_KEY }, select: { id: true, tenantId: true, ownerType: true, tenant: { select: { kind: true } } } })
	if (store?.ownerType !== "PLATFORM" || store.tenant.kind !== "PLATFORM") return { synced: 0 }
	const industry = await prisma.industry.findUnique({ where: { id: industryId }, include: { categoryTemplates: { where: { active: true }, orderBy: { displayOrder: "asc" } } } })
	if (!industry) return { synced: 0 }
	await prisma.category.updateMany({ where: { tenantId: store.tenantId, storeId: store.id, industryId }, data: { active: false } })
	let synced = 0
	for (const template of industry.categoryTemplates) {
		await prisma.category.upsert({
			where: { tenantId_industryId_slug: { tenantId: store.tenantId, industryId: industry.id, slug: template.slug } },
			update: { storeId: store.id, active: true, name: template.name, description: template.description, imageUrl: template.imageUrl },
			create: { tenantId: store.tenantId, storeId: store.id, industryId: industry.id, active: true, name: template.name, slug: template.slug, description: template.description, imageUrl: template.imageUrl },
		})
		synced += 1
	}
	return { synced }
}
