import Link from "next/link"
import { ArrowRight, Percent, Truck, ShieldCheck } from "lucide-react"

const dealCards = [
	{
		title: "Weekend Smartphone Drop",
		description:
			"Get up to 18% off selected iPhone and Samsung models with free delivery nationwide.",
		href: "/products?category=phones&sort=price-desc",
		badge: "Hot deal",
	},
	{
		title: "Work-from-Home Essentials",
		description:
			"Save on monitors, docking stations, and premium keyboards for your home office setup.",
		href: "/products?category=laptops&sort=rating",
		badge: "Top picks",
	},
	{
		title: "Audio & Accessories",
		description:
			"Bundle pricing on headphones, smartwatches, and charging gear for everyday upgrades.",
		href: "/products?category=accessories",
		badge: "New",
	},
]

export default function DealsPage() {
	return (
		<div className="space-y-10">
			<section className="glass-card rounded-3xl p-6 sm:p-8 md:p-12 text-center">
				<div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-4">
					<Percent size={16} />
					Today&apos;s Deals
				</div>
				<h1 className="text-3xl md:text-5xl font-bold mb-4">
					Fresh savings for every upgrade
				</h1>
				<p className="mx-auto max-w-2xl text-gray-600 dark:text-gray-300">
					Discover limited-time offers on trusted tech essentials, all backed by
					official warranties and fast delivery across Kenya.
				</p>
			</section>

			<section className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
				{dealCards.map((deal) => (
					<div key={deal.title} className="glass-card rounded-2xl p-6">
						<span className="mb-4 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
							{deal.badge}
						</span>
						<h2 className="mb-3 text-2xl font-bold">{deal.title}</h2>
						<p className="mb-6 text-gray-600 dark:text-gray-300">
							{deal.description}
						</p>
						<Link
							href={deal.href}
							className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
						>
							Shop the deal <ArrowRight size={16} />
						</Link>
					</div>
				))}
			</section>

			<section className="grid gap-6 grid-cols-1 md:grid-cols-3">
				<div className="glass-card rounded-2xl p-6">
					<Truck className="mb-4 text-primary" size={28} />
					<h3 className="mb-2 text-lg font-semibold">Fast delivery</h3>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						Same-day dispatch on many in-stock items in Nairobi and nearby
						regions.
					</p>
				</div>
				<div className="glass-card rounded-2xl p-6">
					<ShieldCheck className="mb-4 text-primary" size={28} />
					<h3 className="mb-2 text-lg font-semibold">Genuine tech</h3>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						Official warranties on premium devices and accessories from trusted
						brands.
					</p>
				</div>
				<div className="glass-card rounded-2xl p-6">
					<Percent className="mb-4 text-primary" size={28} />
					<h3 className="mb-2 text-lg font-semibold">Limited-time pricing</h3>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						New offers appear often, so it pays to check back before your next
						upgrade.
					</p>
				</div>
			</section>
		</div>
	)
}
