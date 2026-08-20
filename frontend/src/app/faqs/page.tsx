import InfoPage from "@/components/content/InfoPage"

export default function FaqsPage() {
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
