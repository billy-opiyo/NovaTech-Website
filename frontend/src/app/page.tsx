import MerchantHomePage from "@/components/home/MerchantHomePage"
import PlatformDiscoveryHome from "@/components/home/PlatformDiscoveryHome"
import { getCachedPublicPlans } from "@/lib/public-plans.server"
import { getCachedPlatformDiscoveryStores, getStorePublicUrl } from "@/lib/store-directory.server"
import { getStoreContext } from "@/lib/store-context.server"
import { getCachedFeaturedProducts, getCachedPlatformStoreHomepageProducts } from "@/lib/public-recommendations.server"
import { getCachedMvpPilotDays } from "@/lib/public-pilot-policy.server"

export default async function HomePage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		// Keep cold-cache database reads from competing for all of the small
		// serverless Prisma pool at once. Warm requests return from Next's cache.
		const stores = await getCachedPlatformDiscoveryStores()
		const publicPlans = await getCachedPublicPlans()
		const pilotDays = await getCachedMvpPilotDays()
		const entries = await Promise.all(stores.map(async (entry) => ({ ...entry, href: await getStorePublicUrl(entry.slug) })))
		return <PlatformDiscoveryHome stores={entries} plans={publicPlans.plans} plansUnavailable={publicPlans.unavailable} plansSource={publicPlans.source} pilotDays={pilotDays} />
	}

	const featuredProducts = store.ownerType === "PLATFORM"
		? await getCachedPlatformStoreHomepageProducts().catch(() => [])
		: await getCachedFeaturedProducts(store.tenantId, 4).catch(() => [])
	return <MerchantHomePage featuredProducts={featuredProducts} />
}
