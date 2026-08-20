import MerchantHomePage from "@/components/home/MerchantHomePage"
import PlatformDiscoveryHome from "@/components/home/PlatformDiscoveryHome"
import { getPlatformDiscoveryStores, getStorePublicUrl } from "@/lib/store-directory.server"
import { getStoreContext } from "@/lib/store-context.server"

export default async function HomePage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		const stores = await getPlatformDiscoveryStores()
		const entries = await Promise.all(stores.map(async (entry) => ({ ...entry, href: await getStorePublicUrl(entry.slug) })))
		return <PlatformDiscoveryHome stores={entries} />
	}

	return <MerchantHomePage />
}
