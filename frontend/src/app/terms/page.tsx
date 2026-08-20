import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"

export default async function TermsPage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		return <InfoPage title="Merchant Platform Terms" description="The terms that apply when a merchant creates and operates a store on Nurava Tech." sections={[
			{ title: "Using the platform", content: "Merchants must provide accurate business and account information, keep login credentials secure, and use Nurava Tech only for lawful business activity. A merchant is responsible for its store content, catalogue, customer communications, and compliance obligations." },
			{ title: "Platform services and billing", content: "Nurava Tech provides store discovery, hosting, storefront technology, merchant tools, and platform support. The selected plan, one-time setup fee, subscription charges, included limits, and any add-ons are shown during onboarding or in the merchant workspace. Platform billing does not represent payment for a shopper's product order." },
			{ title: "Merchant sales responsibility", content: "Each independent merchant is the seller of its products and controls availability, prices, delivery, refunds, replacements, warranties, taxes, and customer support. Nurava Tech connects merchants and shoppers and provides technology; it does not become the merchant of record for products listed by independent stores." },
			{ title: "Access, support, and suspension", content: "Merchants can contact Nurava Tech about platform access, hosting, billing, or technical support. We may limit or suspend platform access for non-payment, security risks, unlawful activity, or material misuse, while the merchant remains responsible for resolving its customer obligations." },
		]} />
	}

	return <InfoPage title="Terms and Conditions" description="The terms that apply when you use this independent store or contact its merchant about a product." sections={[
		{ title: "Using the store", content: "Please provide accurate information, keep your login details secure, and use the store only for lawful purposes. The merchant may suspend access involved in fraud, abuse, or attempts to compromise the service." },
		{ title: "Products and orders", content: "The independent merchant controls product availability, prices, delivery estimates, promotions, order acceptance, and customer communications. Nurava Tech provides the underlying discovery and storefront technology." },
		{ title: "Support, returns, and warranties", content: "The merchant that sells a product is responsible for delivery, refunds, replacements, warranty claims, taxes, and customer support. Contact the merchant directly about a purchase or product issue. Nothing in these terms limits rights that cannot legally be excluded." },
	]} />
}
