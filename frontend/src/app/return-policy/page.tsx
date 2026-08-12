import InfoPage from "@/components/content/InfoPage"

export default function ReturnPolicyPage() {
	return (
		<InfoPage
			title="Return Policy"
			description="Our straightforward process for resolving defective or incorrect deliveries."
			sections={[
				{
					title: "Seven-day replacement guarantee",
					content:
						"Defective products can be reported within 7 days of delivery for assessment and, where applicable, replacement.",
				},
				{
					title: "Return conditions",
					content:
						"Items should be returned in their original packaging with all accessories, documentation, and proof of purchase included.",
				},
				{
					title: "Start a return",
					content:
						"Contact our support team with your order number and a description of the issue. We will guide you through the next steps.",
				},
			]}
		/>
	)
}
