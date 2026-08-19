export default function PlatformBillingPage() {
	return (
		<div className="space-y-6">
			<h2 className="text-3xl font-bold">Plans and billing</h2>
			<div className="glass-card p-6">
				<p className="font-semibold">Billing provider not configured</p>
				<p className="mt-2 text-sm text-gray-500">Subscription monitoring and plan changes remain unavailable until SaaS billing credentials and webhook verification are configured.</p>
			</div>
		</div>
	)
}
