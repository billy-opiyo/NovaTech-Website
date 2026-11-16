import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"
import { DEFAULT_PLATFORM_TERMS, platformPolicySections } from "@/lib/platform-policy-content"
import { PLATFORM_STORE_DROPSHIPPING_TERMS } from "@/lib/platform-store-policy-content"

export default async function TermsPage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		return <InfoPage title="Platform Terms for Merchants" description={`Terms governing merchant access to the services provided by ${store.platformBrandName}. Shopper terms for independent stores are set by each merchant.`} sections={platformPolicySections(store.platformSettings?.legal?.terms || DEFAULT_PLATFORM_TERMS, "Platform terms")} />
	}
	if (store.ownerType === "PLATFORM") return <InfoPage title={`${store.brand.name} Store Terms`} description="Terms for orders placed with the Nurava HubStores-owned store, including products fulfilled through supplier dropshipping." sections={[...platformPolicySections(store.platformSettings?.legal?.terms || store.legal?.terms || DEFAULT_PLATFORM_TERMS, "Platform terms"), ...platformPolicySections(PLATFORM_STORE_DROPSHIPPING_TERMS, "Dropshipping terms")]} />
	if (store.legal?.terms) return <InfoPage title={`${store.brand.name} Store Terms`} description={`The customer terms that apply when you use ${store.brand.name} or contact its merchant about a product.`} sections={platformPolicySections(store.legal.terms, "Store terms")} />

	return <InfoPage title="Store Terms" description="The terms that apply when you use this independent store or contact its merchant about a product." sections={[
		{ title: "Using the store", content: "Please provide accurate information, keep your login details secure, and use the store only for lawful purposes. The merchant may suspend access involved in fraud, abuse, or attempts to compromise the service." },
		{ title: "Products and orders", content: "This store controls product availability, prices, delivery estimates, promotions, order acceptance, and customer communications. Contact the store directly with questions about a product or order." },
		{ title: "Support, returns, and warranties", content: "The merchant that sells a product is responsible for delivery, refunds, replacements, warranty claims, taxes, and customer support. Contact the merchant directly about a purchase or product issue. Nothing in these terms limits rights that cannot legally be excluded." },
	]} />
}
