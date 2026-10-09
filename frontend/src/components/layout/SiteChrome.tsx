"use client"

import { usePathname } from "next/navigation"
import { Phone, Store as StoreIcon } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import MobileNav from "@/components/layout/MobileNav"
import PlatformMobileNav from "@/components/layout/PlatformMobileNav"
import FloatingActions from "@/components/layout/FloatingActions"
import AppDownloadPrompt from "@/components/layout/AppDownloadPrompt"
import SplashScreen from "@/components/layout/SplashScreen"
import { useStoreContext } from "@/lib/store-context"
import { getWhatsAppChatHref } from "@/lib/merchant-contact"

function isControlPlanePath(pathname: string | null) {
	return /(^|\/)(admin|manage|platform)(\/|$)/.test(pathname || "")
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const store = useStoreContext()

	// Admin and merchant workspace layouts own their complete navigation. Do not
	// mount public storefront chrome around them, especially the fixed mobile bar
	// which can cover workspace actions such as Sign Out.
	if (isControlPlanePath(pathname)) return <>{children}</>
	const suspended = !store.isPlatformHome && store.publicationStatus === "SUSPENDED"
	const phone = store.contact.phoneDisplay || ""
	const whatsappHref = getWhatsAppChatHref(store.contact.whatsappNumber, `Hello ${store.brand.name}, I would like to ask about the store availability.`)

	return (
		<SplashScreen platformHome={store.isPlatformHome}>
			<>
				<Header />
				<main className="mx-auto max-w-7xl px-3 py-6 pb-24 sm:px-5 sm:py-8 lg:px-8 lg:pb-8">
					{ suspended ? <section className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center py-12"><div className="glass-card w-full p-8 text-center sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><StoreIcon size={30} /></div><h1 className="mt-5 text-2xl font-bold sm:text-3xl">The {store.brand.name} is Temporarily Unavailable</h1><p className="mx-auto mt-3 max-w-lg text-gray-500">Please Contact the Merchant Store Owner for More Info.</p><div className="mt-7 flex flex-wrap justify-center gap-3">{whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#1e8e3e] px-4 py-3 font-semibold text-white transition hover:bg-[#25D366]"><FaWhatsapp size={19} /> WhatsApp merchant</a>}{phone && <a href={store.contact.phoneHref || `tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary hover:text-white"><Phone size={18} /> {phone}</a>}</div></div></section> : children}
				</main>
				<Footer />
				<AppDownloadPrompt showOnPlatformHomepage={store.isPlatformHome && pathname === "/"} />
				{store.isPlatformHome && <PlatformMobileNav />}
				{!store.isPlatformHome && <MobileNav />}
				<FloatingActions />
			</>
		</SplashScreen>
	)
}
