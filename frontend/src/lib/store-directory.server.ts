import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { clientConfig } from "@/config/client.config"
import { normalizeHostname } from "backend/lib/tenant"
import { getPlatformDomain } from "backend/lib/platform-domain"

export type PublishedStoreDirectoryEntry = {
	id: string
	name: string
	slug: string
	logoUrl: string | null
	tagline: string
	featuredProduct: { name: string; slug: string; price: number; image: string | null } | null
}

const jsonRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

export async function getPublishedStores(): Promise<PublishedStoreDirectoryEntry[]> {
	try {
		const stores = await prisma.store.findMany({
			where: {
				publicationStatus: "PUBLISHED",
				tenant: { status: { in: ["ACTIVE", "TRIALING"] } },
			},
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				slug: true,
				logoUrl: true,
				homepageSettings: true,
				tenant: {
					select: {
						products: {
							where: { isFeatured: true },
							orderBy: { updatedAt: "desc" },
							take: 1,
							select: { name: true, slug: true, price: true, discountedPrice: true, images: true },
						},
					},
				},
			},
		})

		return stores.map((store) => {
			const homepage = jsonRecord(store.homepageSettings)
			const tagline = typeof homepage.heroDescription === "string" ? homepage.heroDescription : "Explore this store's products and offers."
			const product = store.tenant.products[0]
			return {
				id: store.id,
				name: store.name,
				slug: store.slug,
				logoUrl: store.logoUrl,
				tagline,
				featuredProduct: product ? {
					name: product.name,
					slug: product.slug,
					price: product.discountedPrice ?? product.price,
					image: product.images[0] || null,
				} : null,
			}
		})
	} catch (error) {
		if (process.env.NODE_ENV === "production") {
			console.error("Store directory unavailable", error)
			return []
		}

		return [{
			id: "novatech-store",
			name: clientConfig.brand.name,
			slug: "novatech",
			logoUrl: clientConfig.brand.logo,
			tagline: clientConfig.homepage.heroDescription,
			featuredProduct: null,
		}]
	}
}

export async function getStorePublicUrl(slug: string): Promise<string> {
	const requestHeaders = await headers()
	const host = requestHeaders.get("host") || "localhost:3000"
	const hostname = normalizeHostname(host)
	const port = host.includes(":") ? `:${host.split(":").pop()}` : ""
	if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
		return `http://${slug}.localhost${port}`
	}

	const platformDomain = getPlatformDomain()
	return `https://${slug}.${platformDomain}`
}
