import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowRight, Store as StoreIcon } from "lucide-react"
import { getPublishedStores, getStorePublicUrl } from "@/lib/store-directory.server"
import { PREFERRED_STORE_COOKIE } from "@/lib/store-preference"

export default async function StoreDirectoryPage({ searchParams }: { searchParams?: Promise<{ all?: string | string[] }> }) {
	const stores = await getPublishedStores()
	const params = searchParams ? await searchParams : {}
	const browseAll = params.all === "1" || Array.isArray(params.all) && params.all.includes("1")
	const preferredSlug = (await cookies()).get(PREFERRED_STORE_COOKIE)?.value
	const preferredStore = stores.find((store) => store.slug === preferredSlug)
	if (preferredStore && !browseAll) redirect(await getStorePublicUrl(preferredStore.slug))
	const storeLinks = await Promise.all(stores.map(async (store) => ({ store, href: await getStorePublicUrl(store.slug) })))

	return (
		<div className="space-y-10">
			<section className="glass-card navy-glass p-8 text-center sm:p-12">
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
					<StoreIcon size={28} />
				</div>
				<h1 className="text-3xl font-extrabold sm:text-5xl">Browse trusted stores</h1>
				<p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-300">
					Choose a store brand to enter its full storefront, product catalogue, cart, and checkout.
				</p>
			</section>

			{stores.length === 0 ? (
				<div className="glass-card p-8 text-center">
					<h2 className="text-xl font-bold">No published stores yet</h2>
					<p className="mt-2 text-gray-600 dark:text-gray-300">Published merchant storefronts will appear here.</p>
				</div>
			) : (
				<section className="grid gap-6 md:grid-cols-2">
					{storeLinks.map(({ store, href }) => {
						return (
							<a key={store.id} href={href} className="glass-card navy-glass group block p-6 transition hover:-translate-y-1 hover:shadow-xl">
								<div className="flex items-start justify-between gap-4">
									<div className="flex min-w-0 items-center gap-4">
										<div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/70 p-2 dark:bg-white/10">
											<img src={store.logoUrl || "/images/NovaTech icon.png"} alt="" className="h-full w-full object-contain" />
										</div>
										<div>
											<h2 className="truncate text-xl font-bold group-hover:text-primary">{store.name}</h2>
											<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{store.tagline}</p>
										</div>
									</div>
									<ArrowRight className="mt-1 shrink-0 text-primary transition group-hover:translate-x-1" size={20} />
								</div>
								{store.featuredProduct && (
									<p className="mt-6 border-t border-white/10 pt-4 text-sm text-gray-600 dark:text-gray-300">
										Featured: <span className="font-semibold text-theme-text">{store.featuredProduct.name}</span>
									</p>
								)}
								<span className="mt-5 inline-flex items-center gap-2 font-semibold text-primary">Visit store <ArrowRight size={16} /></span>
							</a>
						)
					})}
				</section>
			)}
		</div>
	)
}
