import prisma from "./db"

export const PLATFORM_STORE_OWNER_KEY = "nurava-hubstores"
export const PLATFORM_STORE_TENANT_ID = "platform-nurava-hubstores"
export const PLATFORM_STORE_ID = "nurava-hubstores-store"
export const PLATFORM_STORE_SLUG = "nurava-marketplace"
export const PLATFORM_STORE_NAME = "Nurava HubStores"

export async function getPlatformStore() {
	return prisma.store.findUnique({
		where: { platformOwnerKey: PLATFORM_STORE_OWNER_KEY },
		include: { tenant: { select: { id: true, kind: true, status: true } } },
	})
}

export function isPlatformOwnedStore(store: { ownerType?: string | null; platformOwnerKey?: string | null } | null | undefined) {
	return store?.ownerType === "PLATFORM" && store.platformOwnerKey === PLATFORM_STORE_OWNER_KEY
}
