import InfoPage from "@/components/content/InfoPage"

export default function WarrantyPage() {
	return (
		<InfoPage
			title="Warranty"
			description="Know what is covered and how to get help when you need it."
			sections={[
				{
					title: "Official product coverage",
					content:
						"Warranty coverage is set by the independent merchant and/or manufacturer. Review the exact coverage on the product page and confirm it with the store before purchasing.",
				},
				{
					title: "Making a claim",
					content:
						"Contact the merchant that sold the product with your order details and a description of the issue. The merchant handles the warranty claim and manufacturer coordination.",
				},
				{
					title: "Keep your proof of purchase",
					content:
						"Keep the receipt or order confirmation provided by the merchant, as it may be needed to verify warranty eligibility.",
				},
			]}
		/>
	)
}
