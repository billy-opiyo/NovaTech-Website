import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"

export default async function ReturnPolicyPage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) return <InfoPage title="Returns and refunds" description="Nurava Tech provides the merchant platform; it is not the seller of products displayed by independent stores." sections={[{ title: "Merchant responsibility", content: "Each independent merchant sets and administers its own return, replacement, refund, delivery, and warranty terms for products it sells." }, { title: "Before purchasing", content: "Review the relevant merchant store's policy and contact that merchant directly with product, order, return, or refund questions. Nurava Tech does not collect shopper payments or decide merchant returns." }, { title: "Platform support", content: "Nurava Tech can assist with platform or account issues, but a product return or refund request must be directed to the merchant that sold the product." }]} />
	return (
		<InfoPage
			title="Returns and refunds"
			description="Returns and refunds are handled by the independent merchant operating this store."
			sections={[
				{
					title: "This store's policy",
					content:
						"The merchant sets the applicable return window, eligibility conditions, replacement process, refund method, and warranty handling. Ask the store for its current policy before purchasing.",
				},
				{
					title: "Start a return",
					content:
						"Contact this store directly with your order details and a description of the issue. The merchant will confirm whether the request qualifies and provide the next steps.",
				},
				{
					title: "Platform role",
					content:
						"Nurava Tech provides the storefront technology. It does not collect shopper payments or replace the merchant's own return and refund obligations.",
				},
			]}
		/>
	)
}
