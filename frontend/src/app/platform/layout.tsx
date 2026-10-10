import { requirePlatformSession } from "@/lib/tenant-auth"
import FloatingActions from "@/components/layout/FloatingActions"
import PlatformNavigation from "./PlatformNavigation"

export const metadata = {
	robots: { index: false, follow: false },
}

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
	const session = await requirePlatformSession()
	return (
		<div className="min-h-screen bg-gray-50 p-3 text-gray-900 sm:p-4 lg:p-6 dark:bg-dark-bg dark:text-white">
			<header className="sticky top-0 z-40 -mx-3 mb-6 border-b border-gray-200/80 bg-gray-50/95 px-3 py-3 backdrop-blur-lg dark:border-white/10 dark:bg-dark-bg/95 sm:-mx-4 sm:px-4 lg:-mx-6 lg:mb-8 lg:px-6">
				<div className="mx-auto flex max-w-6xl min-w-0 flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Nurava HubStores platform</p>
						<h1 className="text-2xl font-bold">Control plane</h1>
					</div>
					<PlatformNavigation isSuperAdmin={session.user.role === "SUPERADMIN"} canManageContent={session.user.role === "SUPERADMIN" || ["PLATFORM_OWNER", "PLATFORM_ADMIN"].includes(session.user.platformRole || "")} />
				</div>
			</header>
			<main className="mx-auto max-w-6xl">{children}</main>
			<FloatingActions />
		</div>
	)
}
