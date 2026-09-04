import type { ClientConfig } from "@/config/client.config"

export type StoreContext = ClientConfig & {
	tenantId: string
	storeId: string
	storeSlug: string
	/** URL prefix used when this store is reached through the platform host. */
	storePathPrefix: string
	publicationStatus: "DRAFT" | "PUBLISHED" | "SUSPENDED"
	isPlatformHome: boolean
}
