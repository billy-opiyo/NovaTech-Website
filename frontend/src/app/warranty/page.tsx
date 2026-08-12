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
						"Our products come with official manufacturer warranty. Most electronics include 12 months of coverage; exact details are listed on each product page.",
				},
				{
					title: "Making a claim",
					content:
						"Contact us with your order number, product details, and a description of the issue. Our team will help coordinate the warranty claim with the manufacturer.",
				},
				{
					title: "Keep your proof of purchase",
					content:
						"Please keep your receipt and order information available, as they may be needed to verify warranty eligibility.",
				},
			]}
		/>
	)
}
