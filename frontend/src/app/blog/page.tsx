import InfoPage from "@/components/content/InfoPage"

export default function BlogPage() {
	return (
		<InfoPage
			title="Nurava Tech Blog"
			description="Helpful buying guides, product advice, and updates from Nurava Tech."
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
