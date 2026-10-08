import { Store as StoreIcon } from "lucide-react"
import { getPublishedStores, getStorePublicUrl } from "@/lib/store-directory.server"
import StoreDirectoryBrowser from "@/components/home/StoreDirectoryBrowser"

export default async function StoreDirectoryPage() {
	const stores = await getPublishedStores()
	const storeLinks = await Promise.all(stores.map(async (store) => ({ ...store, href: await getStorePublicUrl(store.slug) })))

	return (
		<div className="space-y-10">
			<section className="glass-card navy-glass p-8 text-center sm:p-12">
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
					<StoreIcon size={28} />
				</div>
				<h1 className="text-3xl font-extrabold sm:text-5xl">Browse trusted stores</h1>
				<p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-300">
					Choose an independent store to browse its catalogue and send a product enquiry directly to the merchant.
				</p>
			</section>

			{stores.length === 0 ? (
				<div className="glass-card p-8 text-center">
					<h2 className="text-xl font-bold">No published stores yet</h2>
					<p className="mt-2 text-gray-600 dark:text-gray-300">Published merchant storefronts will appear here.</p>
				</div>
			) : (
				<StoreDirectoryBrowser stores={storeLinks} />
			)}
		</div>
	)
}
