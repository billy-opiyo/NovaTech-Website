import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"

export default async function FaqsPage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		return <InfoPage title="Merchant FAQs" description="Answers for merchants joining and operating a store on Nurava Tech." sections={[
			{ title: "What does Nurava Tech provide?", content: "Nurava Tech provides store discovery, storefront technology, hosting, merchant tools, and platform support. Merchants remain responsible for their products and customer relationships." },
			{ title: "How do I start a store?", content: "Open Create Store to create a merchant workspace, choose an available plan, and continue setup from the merchant dashboard." },
			{ title: "How do platform billing and setup fees work?", content: "The selected plan can include a one-time setup fee, recurring subscription charges, included limits, and optional add-ons. Review the plan details in the merchant workspace before confirming." },
			{ title: "Who handles product sales and shopper support?", content: "The individual merchant handles product sales, payment instructions, delivery, refunds, replacements, warranties, and shopper support. Nurava Tech provides the platform connection and merchant technology." },
		]} />
	}

	return (
		<InfoPage
			title="Frequently Asked Questions"
			description="Quick answers about finding independent stores, product enquiries, delivery, payments, returns, and warranty support."
			sections={[
				{
					title: "How long does delivery take?",
					content:
						"Delivery times are set and confirmed by each independent store. Ask the merchant for the current delivery options and timeline.",
				},
				{
					title: "What payment methods do you accept?",
					content:
						"Each store sets its own payment options. Nurava Tech does not collect shopper payments; contact the merchant directly for payment instructions.",
				},
				{
					title: "Are your products genuine?",
					content:
						"Product authenticity and warranty coverage are responsibilities of the individual merchant. Review the product details and confirm with the store before purchasing.",
				},
			]}
		/>
	)
}
