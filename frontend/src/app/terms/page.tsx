import InfoPage from "@/components/content/InfoPage"

export default function TermsPage() {
	return <InfoPage title="Terms and Conditions" description="The terms that apply when you use Nurava Tech or place an order with us." sections={[
		{ title: "Using the store", content: "Please provide accurate account and delivery information, keep your login details secure, and use the store only for lawful purposes. We may suspend accounts involved in fraud, abuse, or attempts to compromise the service." },
		{ title: "Products and merchant orders", content: "Nurava Tech provides product discovery and storefront technology. Each independent merchant controls product availability, prices, delivery estimates, promotions, order acceptance, and customer communications." },
		{ title: "Support, returns, and warranties", content: "The merchant that sells a product is responsible for delivery, refunds, replacements, warranty claims, taxes, and customer support. Nurava Tech provides the platform and can assist with platform-related issues. Nothing in these terms limits rights that cannot legally be excluded." },
	]} />
}
