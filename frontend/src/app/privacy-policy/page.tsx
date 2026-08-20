import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"

export default async function PrivacyPolicyPage() {
	const store = await getStoreContext()
	if (store.isPlatformHome) {
		return <InfoPage title="Merchant Privacy Policy" description="How Nurava Tech handles information provided by merchants who use the platform." sections={[
			{ title: "Information we collect from merchants", content: "We collect information needed to create and operate a merchant account, including your name, business details, email address, phone number, store configuration, domain settings, subscription details, and support communications." },
			{ title: "How we use merchant information", content: "We use this information to provide store hosting and discovery, manage merchant access, process platform subscriptions and setup fees, provide support, protect the platform, and improve our SaaS services. We do not use Nurava Tech as the seller of a merchant's products." },
			{ title: "Merchant responsibilities and choices", content: "Merchants are responsible for the customer information they collect through their own store and for providing any notices required for that information. Merchants can update account details, manage communication preferences, and request access or deletion of platform-held account information by contacting support." },
		]} />
	}

	return <InfoPage title="Privacy Policy" description="How this independent store collects, uses, and protects shopper information." sections={[
		{ title: "Information we collect", content: "This store may collect details you provide when you create an account, contact the merchant, request product information, or subscribe to updates. This can include your name, email address, phone number, delivery details, and order information." },
		{ title: "How the store uses information", content: "The independent merchant uses your information to respond to enquiries, arrange purchases and delivery directly, provide support, protect accounts, and send marketing messages when you have chosen to receive them. Nurava Tech provides the platform and is not the seller of the merchant's products." },
		{ title: "Your choices", content: "Contact the merchant that operates this store to update your details, change communication preferences, or ask about access or deletion of information held for your shopper relationship." },
	]} />
}
