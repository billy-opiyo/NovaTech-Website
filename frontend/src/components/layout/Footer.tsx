"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaTwitter, FaWhatsapp, FaYoutube } from "react-icons/fa"
import { useStoreContext } from "@/lib/store-context"
import { clientConfig } from "@/config/client.config"
import { isVercelProjectHostname } from "@/lib/platform-store-route"
import { getWhatsAppChatHref } from "@/lib/merchant-contact"
import { getStoreRouteHref } from "@/lib/store-home"
import { APP_DOWNLOAD_FILENAME, APP_DOWNLOAD_PATH, handleOpenAppClick, handleOpenWebsiteClick } from "@/lib/android-app-download"

const PLATFORM_HOME_URL = clientConfig.site.url

const socialLinks = (store: ReturnType<typeof useStoreContext>) => {
	const platform = store.ownerType === "PLATFORM" ? store.platformSettings : undefined
	const social = platform?.social || store.social
	const contact = platform?.contact || store.contact
	const features = platform?.features || store.features
	return [
	{
		label: "Facebook",
		href: social.facebook,
		icon: FaFacebookF,
		color: "bg-blue-600 hover:bg-blue-700",
	},
	{
		label: "Instagram",
		href: social.instagram,
		icon: FaInstagram,
		color: "bg-pink-600 hover:bg-pink-700",
	},
	{
		label: "TikTok",
		href: social.tiktok,
		icon: FaTiktok,
		color: "bg-black hover:bg-neutral-800",
	},
	{
		label: "LinkedIn",
		href: social.linkedin,
		icon: FaLinkedinIn,
		color: "bg-sky-700 hover:bg-sky-800",
	},
	{
		label: "YouTube",
		href: social.youtube,
		icon: FaYoutube,
		color: "bg-red-600 hover:bg-red-700",
	},
	{
		label: "X",
		href: social.x,
		icon: FaTwitter,
		color: "bg-black hover:bg-neutral-800",
	},
	...((features.showWhatsAppContact as boolean) === false ? [] : [{
		label: "WhatsApp",
		href: getWhatsAppChatHref(contact.whatsappNumber || "", contact.whatsappFloatingMessage || ""),
		icon: FaWhatsapp,
		color: "bg-emerald-600 hover:bg-emerald-700",
	}]),
	].filter((link) => Boolean(link.href))
}

const shopperServiceLinks = [
	{ label: "Contact Us", href: "/contact" },
	{ label: "FAQs", href: "/faqs" },
	{ label: "Return Policy", href: "/return-policy" },
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

const platformStoreQuickLinks = [
	{ label: "Shop products", href: "/products" },
	{ label: "Track order", href: "/account/orders" },
	{ label: "About platform", href: "/about" },
	{ label: "Contact Platform", href: "/contact" },
	{ label: "Blog", href: "/blog" },
]

const platformQuickLinks = [
	{ label: "Browse Stores", href: "/stores?all=1" },
	{ label: "About platform", href: "/about" },
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
	const [isAndroidApp, setIsAndroidApp] = useState(false)
	const [isAndroidDevice, setIsAndroidDevice] = useState(false)
	const customerServiceLinks = [...shopperServiceLinks, {
		label: store.industry?.slug === "electronics" ? "Warranty" : store.industry?.slug === "cakes" ? "Cake Orders & Quality" : store.industry?.slug === "furniture" ? "Furniture Care & Support" : "Product Support",
		href: "/warranty",
	}]
	const [platformHomeHref, setPlatformHomeHref] = useState<string>(PLATFORM_HOME_URL)
	const footerDescription = store.isPlatformHome
		? store.site.footerDescription || `${store.brand.tagline}. Discover independent stores and contact merchants directly.`
		: store.ownerType === "PLATFORM"
		? store.platformSettings?.site?.footerDescription || store.site.footerDescription || `${store.brand.tagline}. Shop products from the platform-owned store.`
		: store.homepage.heroDescription?.trim() || `Explore the products and offers available from ${store.brand.name}. Contact the store directly for assistance.`
	const platformHomeLink = `${platformHomeHref.replace(/\/$/, "")}/?platformHome=1`
	const platformBrowseStoresLink = `${platformHomeHref.replace(/\/$/, "")}/stores?all=1`
	const footerBrandName = store.ownerType === "PLATFORM"
		? store.platformSettings?.brand?.name || store.brand.name
		: store.brand.name

	useEffect(() => {
		const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
		setIsAndroidApp(isNativeAndroid)
		setIsAndroidDevice(isNativeAndroid || /Android/i.test(window.navigator.userAgent))
	}, [])

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
					<h3 className="text-lg font-bold mb-4">{footerBrandName}</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{footerDescription}
					</p>
				</div>

				<div className="mx-auto lg:mx-0">
					<h4 className="font-semibold mb-3">{store.isPlatformHome ? "Merchant Support" : store.ownerType === "PLATFORM" ? "Platform Support" : "Customer Service"}</h4>
					<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						{(store.isPlatformHome ? merchantServiceLinks : store.ownerType === "PLATFORM" ? [{ label: "Contact Platform", href: "/contact" }, { label: "Platform FAQs", href: "/faqs" }] : customerServiceLinks).map(({ label, href }) => (
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
						{!store.isPlatformHome && store.ownerType !== "PLATFORM" && <>
							<li><a href={platformHomeLink} className="font-semibold text-primary hover:underline">Platform Homepage</a></li>
							<li><a href={platformBrowseStoresLink} className="hover:text-primary transition-colors">Browse Stores</a></li>
						</>}
						{!store.isPlatformHome && store.ownerType === "PLATFORM" && <li><a href={platformHomeLink} className="font-semibold text-primary hover:underline">Platform Homepage</a></li>}
						{(store.isPlatformHome ? platformQuickLinks : store.ownerType === "PLATFORM" ? platformStoreQuickLinks : quickLinks).map(({ label, href }) => (
							<li key={href}>
								<Link href={store.isPlatformHome ? href : getStoreRouteHref(store, href)} className="hover:text-primary transition-colors">
									{label}
								</Link>
							</li>
						))}
						<li>
							{isAndroidApp ? (
								<a href="#" onClick={handleOpenWebsiteClick} className="font-semibold text-primary hover:underline">Open Website</a>
							) : (
							<a
								href={APP_DOWNLOAD_PATH}
								download={APP_DOWNLOAD_FILENAME}
								onClick={handleOpenAppClick}
								className="font-semibold text-primary hover:underline"
							>
								{isAndroidDevice ? "Open App" : "Download Android App"}
							</a>
							)}
						</li>
					</ul>
				</div>

				<div className="mx-auto lg:mx-0">
					{(((store.ownerType === "PLATFORM" ? store.platformSettings?.features?.showSocialLinks : store.features.showSocialLinks) as boolean) !== false) && <>
						<h4 className="font-semibold mb-3">Stay Connected</h4>
						<div className="flex justify-center gap-3 lg:justify-start">
							{socialLinks(store).map(({ label, href, icon: Icon, color }) => (
							<Link
								key={label}
								href={href!}
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
						© {year} {footerBrandName}. All rights reserved.
					</p>
					<div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500 lg:justify-start">
						{legalLinks.map(({ label, href }) => <Link key={href} href={store.isPlatformHome ? href : getStoreRouteHref(store, href)} className="hover:text-primary">{label}</Link>)}
					</div>
				</div>
			</div>
		</footer>
	)
}
