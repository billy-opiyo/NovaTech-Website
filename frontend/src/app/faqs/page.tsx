import InfoPage from "@/components/content/InfoPage"

export default function FaqsPage() {
	return (
		<InfoPage
			title="Frequently Asked Questions"
			description="Quick answers about orders, delivery, payments, returns, and product support."
			sections={[
				{
					title: "How long does delivery take?",
					content:
						"Nairobi deliveries typically take 1–2 business days. Deliveries outside Nairobi usually take 2–5 business days, depending on the destination.",
				},
				{
					title: "What payment methods do you accept?",
					content:
						"We accept M-Pesa and Cash on Delivery where available. Payment instructions are shown during checkout.",
				},
				{
					title: "Are your products genuine?",
					content:
						"Yes. Our products are sourced from trusted distributors, and the warranty details for each item are shown on its product page.",
				},
			]}
		/>
	)
}
