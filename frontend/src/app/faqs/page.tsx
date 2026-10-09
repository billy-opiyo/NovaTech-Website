import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"

export default async function FaqsPage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		return <InfoPage title="Merchant FAQs" description="Answers for merchants joining and operating a store on Nurava HubStores." sections={[
			{ title: "What does Nurava HubStores provide?", content: "Nurava HubStores provides store discovery, storefront technology, hosting, merchant tools, and platform support. Merchants remain responsible for their products and customer relationships." },
			{ title: "How do I start a store?", content: "Open Create Store to create a merchant workspace, choose an available plan, and continue setup from the merchant dashboard." },
			{ title: "How do platform billing and setup fees work?", content: "The selected plan can include a one-time setup fee, recurring subscription charges, included limits, and optional add-ons. Review the plan details in the merchant workspace before confirming." },
			{ title: "Who handles product sales and shopper support?", content: "The individual merchant handles product sales, payment instructions, delivery, refunds, replacements, warranties, and shopper support. Nurava HubStores provides the platform connection and merchant technology." },
		]} />
	}

	const industrySlug = store.industry?.slug
	const storeSections = industrySlug === "cakes" ? [
		{ title: "Can I request a custom cake?", content: "Contact the store with your preferred flavour, size, design, event date, and any dietary requirements. The merchant will confirm availability and price." },
		{ title: "How do I arrange delivery or collection?", content: "Preparation and collection timing vary by order. Ask the store to confirm the deadline, delivery options, and costs for your event." },
		{ title: "Can I change or cancel an order?", content: "Change and cancellation options depend on the order and the store's policy. Contact the merchant as soon as possible." },
	] : industrySlug === "furniture" ? [
		{ title: "How can I confirm dimensions and materials?", content: "Review the product listing and contact the store to confirm measurements, materials, finish, and any custom options before ordering." },
		{ title: "Does the store offer delivery or assembly?", content: "Delivery coverage, assembly, and related costs vary by item and location. Ask the merchant to confirm the available arrangements." },
		{ title: "How do I ask about an order or return?", content: "The store confirms delivery and handles order changes, returns, and after-sales support under its current policies. Contact the merchant directly." },
	] : industrySlug === "boutiques" ? [
		{ title: "How can I choose the right size or fit?", content: "Review the product's available size and fit details, then contact the store for measurements or help choosing an option." },
		{ title: "Can I confirm colours and materials before ordering?", content: "Contact the store to confirm available colours, fabric or material details, and current stock." },
		{ title: "How do I arrange delivery or request a return?", content: "Delivery, exchanges, and returns follow the store's policies. Contact the merchant to confirm the options for your order." },
	] : [
		{ title: "How long does delivery take?", content: "Delivery times are set and confirmed by the store. Ask the merchant for current delivery options and timing." },
		{ title: "What payment methods can I use?", content: `Payment options are selected by ${store.brand.name} and confirmed by the merchant during ordering. Contact the store if you need clarification before paying.` },
		{ title: "How do I get help with a product or order?", content: "Contact the merchant directly with your product or order details. The store can confirm its current support and return policies." },
	]

	return (
		<InfoPage
			title="Frequently Asked Questions"
			description={industrySlug === "cakes" ? `Answers about custom orders, flavours, timing, and collection from ${store.brand.name}.` : industrySlug === "furniture" ? `Answers about product details, delivery, assembly, and support from ${store.brand.name}.` : industrySlug === "boutiques" ? `Answers about clothing sizes, fit, colours, materials, and store policies at ${store.brand.name}.` : `Quick answers about products, delivery, payment, returns, and store support at ${store.brand.name}.`}
			sections={storeSections}
		/>
	)
}
