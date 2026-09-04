"use client"

import { usePathname } from "next/navigation"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import MobileNav from "@/components/layout/MobileNav"
import PlatformMobileNav from "@/components/layout/PlatformMobileNav"
import FloatingActions from "@/components/layout/FloatingActions"
import SplashScreen from "@/components/layout/SplashScreen"
import { useStoreContext } from "@/lib/store-context"

function isControlPlanePath(pathname: string | null) {
	return /(^|\/)(admin|manage)(\/|$)/.test(pathname || "")
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const store = useStoreContext()

	// Admin and merchant workspace layouts own their complete navigation. Do not
	// mount public storefront chrome around them, especially the fixed mobile bar
	// which can cover workspace actions such as Sign Out.
	if (isControlPlanePath(pathname)) return <>{children}</>

	return (
		<SplashScreen platformHome={store.isPlatformHome}>
			<>
				<Header />
				<main className={`max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6 sm:py-8 ${store.isPlatformHome ? "pb-24 lg:pb-8" : "pb-24 md:pb-8"}`}>
					{children}
				</main>
				<Footer />
				{store.isPlatformHome && <PlatformMobileNav />}
				{!store.isPlatformHome && <MobileNav />}
				<FloatingActions />
			</>
		</SplashScreen>
	)
}
