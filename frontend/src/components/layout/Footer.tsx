"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaTwitter, FaWhatsapp, FaYoutube } from "react-icons/fa"
import { useStoreContext } from "@/lib/store-context"
import { clientConfig } from "@/config/client.config"
import { isVercelProjectHostname } from "@/lib/platform-store-route"
import { getWhatsAppChatHref } from "@/lib/merchant-contact"
import { getStoreRouteHref } from "@/lib/store-home"

const PLATFORM_HOME_URL = clientConfig.site.url

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
		label: "LinkedIn",
		href: store.social.linkedin,
		icon: FaLinkedinIn,
		color: "bg-sky-700 hover:bg-sky-800",
	},
	{
		label: "YouTube",
		href: store.social.youtube,
		icon: FaYoutube,
		color: "bg-red-600 hover:bg-red-700",
	},
	{
		label: "X",
		href: store.social.x,
		icon: FaTwitter,
		color: "bg-black hover:bg-neutral-800",
	},
	...((store.features.showWhatsAppContact as boolean) === false ? [] : [{
		label: "WhatsApp",
		href: getWhatsAppChatHref(store.contact.whatsappNumber, store.contact.whatsappFloatingMessage),
		icon: FaWhatsapp,
		color: "bg-emerald-600 hover:bg-emerald-700",
	}]),
].filter((link) => Boolean(link.href))

const shopperServiceLinks = [
	{ label: "Contact Us", href: "/contact" },
	{ label: "FAQs", href: "/faqs" },
	{ label: "Return Policy", href: "/return-policy" },
	{ label: "Warranty", href: "/warranty" },
]

const merchantServiceLinks = [
	{ label: "Merchant Support", href: "/contact" },
	{ label: "Merchant FAQs", href: "/faqs" },
	{ label: "Create Store", href: "/onboarding" },
	{ label: "Subscription & Billing", href: "/manage/billing" },
]

const quickLinks = [
	{ label: "About Us", href: "/about" },
	{ label: "Shop", href: "/products" },
	{ label: "Track Order", href: "/account/orders" },
	{ label: "Blog", href: "/blog" },
]

const platformQuickLinks = [
	{ label: "Browse Stores", href: "/stores?all=1" },
	{ label: "About Nurava Tech", href: "/about" },
	{ label: "Contact Platform", href: "/contact" },
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
	const [platformHomeHref, setPlatformHomeHref] = useState<string>(PLATFORM_HOME_URL)
	const platformHomeLink = `${platformHomeHref.replace(/\/$/, "")}/?platformHome=1`
	const platformBrowseStoresLink = `${platformHomeHref.replace(/\/$/, "")}/stores?all=1`

	useEffect(() => {
		const hostname = window.location.hostname
		if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
			setPlatformHomeHref(`${window.location.protocol}//localhost${window.location.port ? `:${window.location.port}` : ""}`)
		} else if (isVercelProjectHostname(hostname)) {
			setPlatformHomeHref(window.location.origin)
		} else {
			setPlatformHomeHref(PLATFORM_HOME_URL)
		}
	}, [])

	return (
		<footer className="glass mt-20 border-t border-white/10">
			<div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 pb-28 text-center sm:grid-cols-2 sm:py-12 sm:pb-28 md:gap-8 md:pb-24 lg:grid-cols-4 lg:pb-12 lg:text-left">
				<div className="mx-auto max-w-xs lg:mx-0">
					<h3 className="text-lg font-bold mb-4">{store.brand.name}</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{store.isPlatformHome && store.site.footerDescription ? store.site.footerDescription : `${store.brand.tagline}. Discover independent stores and contact merchants directly.`}
					</p>
				</div>

				<div className="mx-auto lg:mx-0">
					<h4 className="font-semibold mb-3">{store.isPlatformHome ? "Merchant Support" : "Customer Service"}</h4>
					<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						{(store.isPlatformHome ? merchantServiceLinks : shopperServiceLinks).map(({ label, href }) => (
							<li key={href}>
								<Link href={store.isPlatformHome ? href : getStoreRouteHref(store, href)} className="hover:text-primary transition-colors">
									{label}
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div className="mx-auto lg:mx-0">
					<h4 className="font-semibold mb-3">Quick Links</h4>
					<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						{!store.isPlatformHome && <>
							<li><a href={platformHomeLink} className="font-semibold text-primary hover:underline">Nurava Tech Homepage</a></li>
							<li><a href={platformBrowseStoresLink} className="hover:text-primary transition-colors">Browse Stores</a></li>
						</>}
						{(store.isPlatformHome ? platformQuickLinks : quickLinks).map(({ label, href }) => (
							<li key={href}>
								<Link href={store.isPlatformHome ? href : getStoreRouteHref(store, href)} className="hover:text-primary transition-colors">
									{label}
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div className="mx-auto lg:mx-0">
					{(store.features.showSocialLinks as boolean) !== false && <>
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
					</>}
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
