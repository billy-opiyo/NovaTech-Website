import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"
import { DEFAULT_PLATFORM_PRIVACY, platformPolicySections } from "@/lib/platform-policy-content"
import { PLATFORM_STORE_PRIVACY_SUPPLEMENT } from "@/lib/platform-store-policy-content"

export default async function PrivacyPolicyPage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		return <InfoPage title="Platform Privacy Policy" description={`How ${store.platformBrandName} handles platform account and service information.`} sections={platformPolicySections(store.platformSettings?.legal?.privacy || DEFAULT_PLATFORM_PRIVACY, "Platform privacy policy")} />
	}
	if (store.ownerType === "PLATFORM") return <InfoPage title={`${store.brand.name} Store Privacy Policy`} description={`How ${store.brand.name} handles information for platform-store purchases and delivery.`} sections={[...platformPolicySections(store.platformSettings?.legal?.privacy || store.legal?.privacy || DEFAULT_PLATFORM_PRIVACY, "Platform privacy policy"), ...platformPolicySections(PLATFORM_STORE_PRIVACY_SUPPLEMENT, "Platform-store privacy details")]} />
	if (store.legal?.privacy) return <InfoPage title={`${store.brand.name} Privacy Policy`} description={`How ${store.brand.name} handles shopper information.`} sections={platformPolicySections(store.legal.privacy, "Store privacy policy")} />

	return <InfoPage title="Privacy Policy" description="How this independent store collects, uses, and protects shopper information." sections={[
		{ title: "Information we collect", content: "This store may collect details you provide when you create an account, contact the merchant, request product information, or subscribe to updates. This can include your name, email address, phone number, delivery details, and order information." },
		{ title: "How the store uses information", content: "This store uses your information to respond to enquiries, arrange purchases and delivery, provide support, protect accounts, and send marketing messages when you have chosen to receive them. The merchant operating this store is responsible for its products and orders." },
		{ title: "Your choices", content: "Contact the merchant that operates this store to update your details, change communication preferences, or ask about access or deletion of information held for your shopper relationship." },
	]} />
}
