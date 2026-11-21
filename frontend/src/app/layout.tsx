import type { Metadata } from "next"
import { headers } from "next/headers"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { CartProvider } from "@/lib/cartContext"
import PlatformHashScroll from "@/components/layout/PlatformHashScroll"
import RouteScrollReset from "@/components/layout/RouteScrollReset"
import StorePreferenceTracker from "@/components/layout/StorePreferenceTracker"
import SiteChrome from "@/components/layout/SiteChrome"
import OfflineNotice from "@/components/layout/OfflineNotice"
import { ToastProvider } from "@/components/ui/Toast"
import { themeToCssVariables } from "@/config/theme-presets"
import { getStoreContext } from "@/lib/store-context.server"
import { resolveStoreTheme } from "@/lib/store-theme"
import { StoreContextProvider } from "@/lib/store-context"
import AuthSessionProvider from "@/components/providers/AuthSessionProvider"
import AndroidBackButtonHandler from "@/components/providers/AndroidBackButtonHandler"
import AndroidAppUpdatePrompt from "@/components/providers/AndroidAppUpdatePrompt"
import AndroidPullToRefresh from "@/components/providers/AndroidPullToRefresh"
import AndroidSystemBars from "@/components/providers/AndroidSystemBars"
import { getPlatformDomain } from "backend/lib/platform-domain"

export async function generateMetadata(): Promise<Metadata> {
	const [store, requestHeaders] = await Promise.all([getStoreContext(), headers()])
	const requestPath = requestHeaders.get("x-nurava-request-path")?.split("?", 1)[0] || "/"
	const storePrefix = `/store/${encodeURIComponent(store.storeSlug)}`
	const requestedPath = requestPath === storePrefix ? "/" : requestPath.startsWith(`${storePrefix}/`) ? requestPath.slice(storePrefix.length) : requestPath
	const pathname = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/"
	const domain = getPlatformDomain()
	const origin = store.isPlatformHome || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(store.storeSlug)
		? `https://${domain}`
		: `https://${store.storeSlug}.${domain}`
	const canonicalUrl = new URL(pathname, origin).toString()
	const privatePath = /^\/(admin|manage|platform|account|auth|onboarding)(?:\/|$)/.test(pathname)
		|| pathname === "/cart"
		|| pathname === "/checkout"
		|| pathname === "/newsletter/unsubscribe"
	return {
		title: { default: store.seo.title || store.brand.name, template: `%s | ${store.brand.name}` },
		description: store.seo.description,
		keywords: store.seo.keywords,
		alternates: { canonical: canonicalUrl },
		...(privatePath ? { robots: { index: false, follow: false } } : {}),
		openGraph: { type: "website", locale: store.site.locale, url: canonicalUrl, siteName: store.brand.name, title: store.seo.title || store.brand.name, description: store.seo.description, ...(store.seo.ogImage ? { images: [store.seo.ogImage] } : {}) },
	}
}

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const store = await getStoreContext()
	const resolvedTheme = resolveStoreTheme(store)
	const activeTheme = resolvedTheme.preset
	return (
		<html
			lang={store.site.language}
			suppressHydrationWarning
			style={themeToCssVariables(activeTheme, resolvedTheme.overrides) as React.CSSProperties}
		>
			<head>
				{/* Apply the theme before CSS can paint to prevent a light-mode flash. */}
				<script
					dangerouslySetInnerHTML={{
						__html: `(() => {
							try {
								const stored = localStorage.getItem("theme");
								const theme = stored === "light" ? "light" : "dark";
								document.documentElement.classList.toggle("dark", theme === "dark");
								document.documentElement.style.colorScheme = theme;
							} catch {
								document.documentElement.classList.add("dark");
								document.documentElement.style.colorScheme = "dark";
							}
						})();`,
					}}
				/>
				<link rel="icon" href={store.brand.favicon} />
				<link rel="preconnect" href="https://images.unsplash.com" />
				<link rel="dns-prefetch" href="https://images.unsplash.com" />
				<link rel="preconnect" href="https://images.pexels.com" />
				<link rel="dns-prefetch" href="https://images.pexels.com" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, viewport-fit=cover"
				/>
				<meta name="theme-color" content={activeTheme.dark.background} />
			</head>
			<body
			className="min-h-screen bg-theme-bg text-theme-text transition-colors duration-300"
			>
				<StoreContextProvider value={store}>
				<AuthSessionProvider>
					<AndroidBackButtonHandler />
					<AndroidPullToRefresh />
				<ThemeProvider>
					<AndroidSystemBars />
					<ToastProvider>
						<CartProvider>
							<RouteScrollReset />
							{store.isPlatformHome && <PlatformHashScroll />}
							<StorePreferenceTracker storeSlug={store.storeSlug} isPlatformHome={store.isPlatformHome} />
							<SiteChrome>{children}</SiteChrome>
							<OfflineNotice />
							<AndroidAppUpdatePrompt showOnPlatformHomepage={store.isPlatformHome} />
						</CartProvider>
					</ToastProvider>
				</ThemeProvider>
				</AuthSessionProvider>
				</StoreContextProvider>
			</body>
		</html>
	)
}
