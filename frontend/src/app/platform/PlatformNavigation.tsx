"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
	{ label: "Overview", href: "/platform" },
	{ label: "Operations", href: "/platform/operations" },
	{ label: "Billing", href: "/platform/billing" },
	{ label: "Platform access", href: "/platform/access" },
	{ label: "Site settings", href: "/platform/settings" },
] as const

export default function PlatformNavigation({ isSuperAdmin }: { isSuperAdmin: boolean }) {
	const pathname = usePathname()
	const visibleLinks = isSuperAdmin ? links : links.slice(0, 3)

	return (
		<nav aria-label="Platform navigation" className="w-full min-w-0 overflow-x-auto pb-1 lg:w-auto">
			<div className="flex min-w-max gap-2 lg:justify-end">
			{visibleLinks.map((link) => {
				const active = pathname === link.href
				return <Link
					key={link.href}
					href={link.href}
					aria-current={active ? "page" : undefined}
					className={`inline-flex shrink-0 items-center justify-center rounded-lg border px-2.5 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${active
						? "border-primary bg-primary text-white shadow-sm"
						: "border-gray-300 bg-white/80 text-gray-700 hover:border-primary/60 hover:bg-primary/10 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-primary/20 dark:hover:text-white"
					} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60`}
				>
					<span className="truncate">{link.label}</span>
				</Link>
			})}
			</div>
		</nav>
	)
}
