import Link from "next/link"
import { Facebook, Instagram, MessageCircleMore, Music2 } from "lucide-react"

const socialLinks = [
	{
		label: "Facebook",
		href: "https://facebook.com",
		icon: Facebook,
		color: "bg-blue-600 hover:bg-blue-700",
	},
	{
		label: "Instagram",
		href: "https://instagram.com",
		icon: Instagram,
		color: "bg-pink-600 hover:bg-pink-700",
	},
	{
		label: "TikTok",
		href: "https://tiktok.com",
		icon: Music2,
		color: "bg-black hover:bg-neutral-800",
	},
	{
		label: "WhatsApp",
		href: "https://wa.me/254700000000",
		icon: MessageCircleMore,
		color: "bg-emerald-600 hover:bg-emerald-700",
	},
]

export default function Footer() {
	const year = new Date().getFullYear()

	return (
		<footer className="glass border-t border-white/10 mt-20">
			<div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
				<div>
					<h3 className="text-lg font-bold mb-4">NovaTech Store</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Your trusted electronics store in Kenya. Genuine products, warranty,
						fast delivery.
					</p>
				</div>

				<div>
					<h4 className="font-semibold mb-3">Customer Service</h4>
					<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						<li>Contact Us</li>
						<li>FAQs</li>
						<li>Return Policy</li>
						<li>Warranty</li>
					</ul>
				</div>

				<div>
					<h4 className="font-semibold mb-3">Quick Links</h4>
					<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						<li>About Us</li>
						<li>Shop</li>
						<li>Track Order</li>
						<li>Blog</li>
					</ul>
				</div>

				<div>
					<h4 className="font-semibold mb-3">Stay Connected</h4>
					<div className="flex gap-3">
						{socialLinks.map(({ label, href, icon: Icon, color }) => (
							<Link
								key={label}
								href={href}
								target="_blank"
								rel="noreferrer"
								aria-label={label}
								className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform duration-200 hover:scale-105 ${color}`}
							>
								<Icon size={18} />
							</Link>
						))}
					</div>
					<p className="text-xs mt-4 text-gray-500">
						© {year} NovaTech Store. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	)
}
