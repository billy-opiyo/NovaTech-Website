import Link from "next/link"
import { requirePlatformSession } from "@/lib/tenant-auth"

export const metadata = {
	robots: { index: false, follow: false },
}

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
	await requirePlatformSession()
	return (
		<div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-dark-bg dark:text-white">
			<header className="mx-auto mb-8 flex max-w-6xl flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Nurava Tech platform</p>
					<h1 className="text-2xl font-bold">Control plane</h1>
				</div>
				<nav className="flex flex-wrap gap-4 text-sm font-semibold">
					<Link href="/platform">Overview</Link>
					<Link href="/platform/operations">Operations</Link>
					<Link href="/platform/billing">Billing</Link>
				</nav>
			</header>
			<main className="mx-auto max-w-6xl">{children}</main>
		</div>
	)
}
