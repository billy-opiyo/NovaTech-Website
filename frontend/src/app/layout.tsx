import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { CartProvider } from "@/lib/cartContext"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import MobileNav from "@/components/layout/MobileNav"
import FloatingActions from "@/components/layout/FloatingActions"
import SessionResume from "@/components/layout/SessionResume"
import StorePreferenceTracker from "@/components/layout/StorePreferenceTracker"
import SplashScreen from "@/components/layout/SplashScreen"
import { ToastProvider } from "@/components/ui/Toast"
import { getThemePreset, themeToCssVariables } from "@/config/theme-presets"
import { getStoreContext } from "@/lib/store-context.server"
import { StoreContextProvider } from "@/lib/store-context"

export async function generateMetadata(): Promise<Metadata> {
	const store = await getStoreContext()
	return {
		title: { default: store.brand.name, template: `%s | ${store.brand.name}` },
		description: store.seo.description,
		keywords: store.seo.keywords,
		openGraph: { type: "website", locale: store.site.locale, url: store.site.url, siteName: store.brand.name, title: store.brand.name, description: store.seo.description },
	}
}

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const store = await getStoreContext()
	const activeTheme = getThemePreset(store.themePreset)
	return (
		<html
			lang={store.site.language}
			className={
				store.features.showSplashScreen ? "splash-pending" : undefined
			}
			suppressHydrationWarning
			style={themeToCssVariables(activeTheme) as React.CSSProperties}
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
				<link rel="icon" type="image/png" href={store.brand.favicon} />
				{store.features.showSplashScreen && (
					<>
						<link
							rel="preload"
							as="image"
							href="/images/NovaTech%20cover%20mobile.png"
							media="(max-width: 767px)"
							fetchPriority="high"
						/>
						<link
							rel="preload"
							as="image"
							href="/images/NovaTech%20cover%20mobile.png"
							media="(min-width: 768px) and (max-width: 1199px)"
							fetchPriority="high"
						/>
						<link
							rel="preload"
							as="image"
							href="/images/NovaTech%20cover%20desktop.png"
							media="(min-width: 1200px)"
							fetchPriority="high"
						/>
					</>
				)}
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
			className={`min-h-screen bg-theme-bg text-theme-text transition-colors duration-300 ${store.features.showSplashScreen ? "splash-pending" : ""}`}
			>
				<StoreContextProvider value={store}>
				<ThemeProvider>
					<ToastProvider>
						<CartProvider>
							<SessionResume />
							<StorePreferenceTracker storeSlug={store.storeSlug} isPlatformHome={store.isPlatformHome} />
							{store.features.showSplashScreen ? (
								<SplashScreen>
									<>
										<Header />
										<main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
											{children}
										</main>
										<Footer />
										<MobileNav />
										<FloatingActions />
									</>
								</SplashScreen>
							) : (
								<>
									<Header />
									<main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
										{children}
									</main>
									<Footer />
									<MobileNav />
									<FloatingActions />
								</>
							)}
						</CartProvider>
					</ToastProvider>
				</ThemeProvider>
				</StoreContextProvider>
			</body>
		</html>
	)
}
