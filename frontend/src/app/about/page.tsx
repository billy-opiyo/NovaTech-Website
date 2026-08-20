import InfoPage from "@/components/content/InfoPage"

export default function AboutPage() {
	return (
		<InfoPage
			title="About Us"
			description="Nurava Tech makes it easier to buy genuine electronics with confidence anywhere in Kenya."
			sections={[
				{
					title: "Who we are",
					content:
						"We are a Kenya-focused electronics store offering phones, laptops, tablets, and accessories from trusted sources.",
				},
				{
					title: "What we value",
					content:
						"Clear product information, genuine products, official warranty coverage, secure payments, and dependable delivery are at the centre of our service.",
				},
			]}
		/>
	)
}
