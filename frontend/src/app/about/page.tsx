import InfoPage from "@/components/content/InfoPage"
import PlatformTeamSection from "@/components/content/PlatformTeamSection"
import { getStoreContext } from "@/lib/store-context.server"

export default async function AboutPage() {
	const store = await getStoreContext()
	if (!store.isPlatformHome) return <InfoPage title={store.homepage.aboutTitle || `About ${store.brand.name}`} description={store.homepage.aboutDescription || `${store.brand.name} is an independent electronics store serving its customers directly.`} sections={[{ title: "Our store", content: store.homepage.aboutDescription || `${store.brand.name} manages its own products, availability, payment arrangements, delivery, returns, warranties, and customer support. Contact the store directly if you need help with a product or purchase.` }, { title: "Shop with confidence", content: `Browse the products published by ${store.brand.name}, confirm the details with the merchant, and use the store's stated payment and delivery arrangements.` }]} />
	return (
		<>
			<InfoPage
				title="About Nurava Tech"
				description="Nurava Tech helps shoppers discover independent electronics stores across Kenya."
				sections={[
					{
						title: "Who we are",
						content:
							"Nurava Tech is a Kenya-focused multi-store platform where independent electronics businesses can present their phones, laptops, tablets, and accessories to shoppers.",
					},
					{
						title: "What we value",
						content:
							"We provide discovery, storefront technology, and merchant tools. Each store remains responsible for product information, authenticity, pricing, payments, delivery, refunds, and warranty commitments.",
					},
				]}
			/>
			<div className="mx-auto max-w-7xl pb-8 sm:pb-12">
				<PlatformTeamSection />
			</div>
		</>
	)
}
