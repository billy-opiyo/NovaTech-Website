import InfoPage from "@/components/content/InfoPage"

export default function BlogPage() {
	return (
		<InfoPage
			title="NovaTech Blog"
			description="Helpful buying guides, product advice, and updates from NovaTech Store."
			sections={[
				{
					title: "Coming soon",
					content:
						"We are preparing practical guides to help you choose, use, and care for your electronics. Check back soon for the first articles.",
				},
			]}
		/>
	)
}
