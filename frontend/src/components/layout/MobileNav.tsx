"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, ShoppingCart, Heart } from "lucide-react"
import clsx from "clsx"
import { useCart } from "@/lib/cartContext"
import SearchOverlay from "@/components/search/SearchOverlay"
import { getStoreRouteHref } from "@/lib/store-home"
import { useStoreContext } from "@/lib/store-context"

const baseNavItems = [
	{ icon: Home, label: "Home", href: "/" },
	{ icon: Search, label: "Search", href: "#search", isAction: true },
	{ icon: ShoppingCart, label: "Cart", href: "/cart", showBadge: true },
	{ icon: Heart, label: "Wishlist", href: "/account/wishlist" },
]

export default function MobileNav() {
	const pathname = usePathname()
	const { itemCount } = useCart()
	const store = useStoreContext()
	const [searchOpen, setSearchOpen] = useState(false)
	const navItems = baseNavItems.map((item) => item.isAction ? item : { ...item, href: getStoreRouteHref(store, item.href) })

	return (
		<>
			<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass backdrop-blur-lg border-t border-white/10 safe-area-inset-bottom">
				<div className="flex items-center justify-around py-2">
					{navItems.map((item) => {
						const isActive = pathname === item.href
						return item.isAction ? (
							<button
								key={item.label}
								onClick={() => setSearchOpen(true)}
								aria-label="Open search"
								className="flex flex-col items-center gap-1 py-1 px-3 text-gray-500 hover:text-primary transition"
							>
								<item.icon size={22} />
								<span className="max-w-20 truncate text-xs">{item.label}</span>
							</button>
						) : (
							<Link
								key={item.href}
								href={item.href}
									className={clsx(
										"flex flex-col items-center gap-1 py-1 px-3 relative transition",
										isActive
											? "text-primary"
											: "text-gray-500 hover:text-primary",
									)}
							>
								<item.icon size={22} />
								{item.showBadge && itemCount > 0 && (
									<span className="absolute -top-1 right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
										{itemCount}
									</span>
								)}
								<span className="text-xs">{item.label}</span>
							</Link>
						)
					})}
				</div>
			</nav>

			<div className="md:hidden h-16" />

			<SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} showTrigger={false} />
		</>
	)
}
