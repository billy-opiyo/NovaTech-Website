import Link from "next/link"

export default function PlatformPage() {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold">Platform overview</h2>
				<p className="mt-2 text-gray-600 dark:text-gray-300">Platform-only operational surfaces are separated from merchant workspaces.</p>
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<Link href="/platform/tenants" className="glass-card block p-6">
					<h3 className="font-semibold">Tenant operations</h3>
					<p className="mt-2 text-sm text-gray-500">Search, onboarding, status, and suspension controls.</p>
				</Link>
				<Link href="/platform/billing" className="glass-card block p-6">
					<h3 className="font-semibold">Plans and billing</h3>
					<p className="mt-2 text-sm text-gray-500">Plan, entitlement, and subscription monitoring.</p>
				</Link>
			</div>
			<p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Live control-plane metrics are unavailable until a configured database and billing provider are connected. No placeholder tenant or revenue data is shown.</p>
		</div>
	)
}
