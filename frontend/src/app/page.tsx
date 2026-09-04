import MerchantHomePage from "@/components/home/MerchantHomePage"
import PlatformDiscoveryHome from "@/components/home/PlatformDiscoveryHome"
import { getFeaturedProducts } from "backend/services/recommendation.service"
import { getPublicPlans } from "@/lib/public-plans.server"
import { getPlatformDiscoveryStores, getStorePublicUrl } from "@/lib/store-directory.server"
import { getStoreContext } from "@/lib/store-context.server"

export default async function HomePage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		const stores = await getPlatformDiscoveryStores()
		const entries = await Promise.all(stores.map(async (entry) => ({ ...entry, href: await getStorePublicUrl(entry.slug) })))
		const publicPlans = await getPublicPlans()
		return <PlatformDiscoveryHome stores={entries} plans={publicPlans.plans} plansUnavailable={publicPlans.unavailable} plansSource={publicPlans.source} />
	}

	const featuredProducts = await getFeaturedProducts(store.tenantId, 4).catch(() => [])
	return <MerchantHomePage featuredProducts={featuredProducts} />
}
