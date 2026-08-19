import Link from "next/link"
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa"
import { useStoreContext } from "@/lib/store-context"

const socialLinks = (store: ReturnType<typeof useStoreContext>) => [
	{
		label: "Facebook",
		href: store.social.facebook,
		icon: FaFacebookF,
		color: "bg-blue-600 hover:bg-blue-700",
	},
	{
		label: "Instagram",
		href: store.social.instagram,
		icon: FaInstagram,
		color: "bg-pink-600 hover:bg-pink-700",
	},
	{
		label: "TikTok",
		href: store.social.tiktok,
		icon: FaTiktok,
		color: "bg-black hover:bg-neutral-800",
	},
	{
		label: "WhatsApp",
		href: `https://wa.me/${store.contact.whatsappNumber}?text=${encodeURIComponent(store.contact.whatsappMessage)}`,
		icon: FaWhatsapp,
		color: "bg-emerald-600 hover:bg-emerald-700",
	},
]

const customerServiceLinks = [
	{ label: "Contact Us", href: "/contact" },
	{ label: "FAQs", href: "/faqs" },
	{ label: "Return Policy", href: "/return-policy" },
	{ label: "Warranty", href: "/warranty" },
]

const quickLinks = [
	{ label: "About Us", href: "/about" },
	{ label: "Shop", href: "/products" },
	{ label: "Track Order", href: "/account/orders" },
	{ label: "Blog", href: "/blog" },
]

const legalLinks = [
	{ label: "Privacy Policy", href: "/privacy-policy" },
	{ label: "Cookie Policy", href: "/cookie-policy" },
	{ label: "Terms", href: "/terms" },
]

export default function Footer() {
	const year = new Date().getFullYear()
	const store = useStoreContext()

	return (
		<footer className="glass mt-20 border-t border-white/10">
			<div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 pb-28 text-center sm:grid-cols-2 sm:py-12 sm:pb-28 md:gap-8 md:pb-24 lg:grid-cols-4 lg:pb-12 lg:text-left">
				<div className="mx-auto max-w-xs lg:mx-0">
					<h3 className="text-lg font-bold mb-4">{store.brand.name}</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{store.brand.tagline}. Genuine products, warranty, fast delivery.
					</p>
				</div>

				<div className="mx-auto lg:mx-0">
					<h4 className="font-semibold mb-3">Customer Service</h4>
					<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						{customerServiceLinks.map(({ label, href }) => (
							<li key={href}>
								<Link href={href} className="hover:text-primary transition-colors">
									{label}
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div className="mx-auto lg:mx-0">
					<h4 className="font-semibold mb-3">Quick Links</h4>
					<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						{quickLinks.map(({ label, href }) => (
							<li key={href}>
								<Link href={href} className="hover:text-primary transition-colors">
									{label}
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div className="mx-auto lg:mx-0">
					<h4 className="font-semibold mb-3">Stay Connected</h4>
					<div className="flex justify-center gap-3 lg:justify-start">
						{socialLinks(store).map(({ label, href, icon: Icon, color }) => (
							<Link
								key={label}
								href={href}
								target="_blank"
								rel="noreferrer"
								aria-label={label}
								className={`flex h-11 w-11 items-center justify-center rounded-[20px] text-white transition-transform duration-200 hover:scale-105 ${color}`}
							>
								<Icon size={24} />
							</Link>
						))}
					</div>
					<p className="text-xs mt-4 text-gray-500">
						© {year} {store.brand.name}. All rights reserved.
					</p>
					<div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500 lg:justify-start">
						{legalLinks.map(({ label, href }) => <Link key={href} href={href} className="hover:text-primary">{label}</Link>)}
					</div>
				</div>
			</div>
		</footer>
	)
}
