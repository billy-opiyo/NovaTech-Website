"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { CreditCard, Home, PlusCircle, Store } from "lucide-react"
import clsx from "clsx"

const navItems = [
	{ icon: Home, label: "Home", href: "/" },
	{ icon: Store, label: "Browse Stores", href: "/stores?all=1", match: "/stores" },
	{ icon: CreditCard, label: "Plans", href: "/#plans" },
	{ icon: PlusCircle, label: "Create Store", href: "/onboarding", match: "/onboarding" },
]

export default function PlatformMobileNav() {
	const pathname = usePathname()
	const [hash, setHash] = useState("")

	useEffect(() => {
		const updateHash = () => setHash(window.location.hash)
		updateHash()
		window.addEventListener("hashchange", updateHash)
		return () => window.removeEventListener("hashchange", updateHash)
	}, [pathname])

	const isPlansHash = pathname === "/" && hash === "#plans"

	return (
		<>
			<nav
				aria-label="Platform navigation"
				className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-white/80 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur-lg dark:bg-slate-950/85"
			>
				<div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
					{navItems.map(({ icon: Icon, label, href, match }) => {
						const isActive = label === "Plans"
							? isPlansHash
							: label === "Home"
								? pathname === "/" && !isPlansHash
								: match ? pathname.startsWith(match) : pathname === href
						return (
							<Link
								key={label}
								href={href}
								aria-current={isActive ? "page" : undefined}
								className={clsx(
									"flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[0.68rem] font-semibold transition-colors sm:text-xs",
									isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300",
								)}
							>
								<Icon size={21} strokeWidth={2.2} aria-hidden="true" />
								<span>{label}</span>
							</Link>
						)
					})}
				</div>
			</nav>
			<div className="lg:hidden h-16" aria-hidden="true" />
		</>
	)
}
