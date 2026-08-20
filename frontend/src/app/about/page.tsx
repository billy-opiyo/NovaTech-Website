import InfoPage from "@/components/content/InfoPage"

export default function AboutPage() {
	return (
		<InfoPage
			title="About Us"
			description="Nurava Tech helps shoppers discover independent electronics stores across Kenya."
			sections={[
				{
					title: "Who we are",
					content:
						"Nurava Tech is a Kenya-focused multi-store platform where independent electronics businesses can present their phones, laptops, tablets, and accessories to shoppers.",
				},
				{
					title: "What we value",
					content:
						"We provide discovery, storefront technology, and merchant tools. Each store remains responsible for product information, authenticity, pricing, payments, delivery, refunds, and warranty commitments.",
				},
			]}
		/>
	)
}
