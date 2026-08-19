import type { ClientConfig } from "@/config/client.config"

export type StoreContext = ClientConfig & {
	tenantId: string
	storeId: string
	storeSlug: string
	publicationStatus: "DRAFT" | "PUBLISHED" | "SUSPENDED"
	isPlatformHome: boolean
}
