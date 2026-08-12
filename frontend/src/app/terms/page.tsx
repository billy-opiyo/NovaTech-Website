import InfoPage from "@/components/content/InfoPage"

export default function TermsPage() {
	return <InfoPage title="Terms and Conditions" description="The terms that apply when you use NovaTech Store or place an order with us." sections={[
		{ title: "Using the store", content: "Please provide accurate account and delivery information, keep your login details secure, and use the store only for lawful purposes. We may suspend accounts involved in fraud, abuse, or attempts to compromise the service." },
		{ title: "Products and orders", content: "Product availability, prices, delivery estimates, and promotions may change. An order is accepted once we confirm it. We will contact you if an item is unavailable or an order needs clarification." },
		{ title: "Support and returns", content: "Returns, replacements, and warranty claims are handled under our published Return Policy and Warranty pages. Nothing in these terms limits rights that cannot legally be excluded." },
	]} />
}
