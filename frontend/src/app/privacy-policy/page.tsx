import InfoPage from "@/components/content/InfoPage"

export default function PrivacyPolicyPage() {
	return <InfoPage title="Privacy Policy" description="How Nurava Tech collects, uses, and protects your information." sections={[
		{ title: "Information we collect", content: "We collect details you provide when you create an account, place an order, contact support, or subscribe to updates. This can include your name, email address, phone number, delivery details, and order information." },
		{ title: "How we use information", content: "We use your information to process orders, provide delivery and support, protect accounts, improve our store, and send marketing messages when you have chosen to receive them. We do not sell your personal information." },
		{ title: "Your choices", content: "You can update your account details and communication preferences from Account Settings. You can also unsubscribe from promotional emails at any time. Contact our team if you need help accessing or deleting your information." },
	]} />
}
