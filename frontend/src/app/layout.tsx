import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { CartProvider } from "@/lib/cartContext"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import MobileNav from "@/components/layout/MobileNav"
import FloatingActions from "@/components/layout/FloatingActions"
import SplashScreen from "@/components/layout/SplashScreen"
import { ToastProvider } from "@/components/ui/Toast"
import { clientConfig } from "@/config/client.config"
import { getThemePreset, themeToCssVariables } from "@/config/theme-presets"

const activeTheme = getThemePreset(clientConfig.themePreset)

export const metadata: Metadata = {
	title: {
		default: clientConfig.brand.name,
		template: `%s | ${clientConfig.brand.name}`,
	},
	description: clientConfig.seo.description,
	keywords: clientConfig.seo.keywords,
	openGraph: {
		type: "website",
		locale: clientConfig.site.locale,
		url: clientConfig.site.url,
		siteName: clientConfig.brand.name,
		title: clientConfig.brand.name,
		description: clientConfig.seo.description,
	},
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang={clientConfig.site.language} suppressHydrationWarning style={themeToCssVariables(activeTheme) as React.CSSProperties}>
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
				<link rel="icon" type="image/png" href={clientConfig.brand.favicon} />
				{clientConfig.features.showSplashScreen && (
					<>
						<link rel="preload" as="image" href="/images/NovaTech cover mobile.png" media="(max-width: 767px)" />
						<link rel="preload" as="image" href="/images/NovaTech cover mobile.png" media="(min-width: 768px) and (max-width: 1199px)" />
						<link rel="preload" as="image" href="/images/NovaTech Cover tablets-iPad.png" media="(min-width: 1200px)" />
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
			<body className="min-h-screen bg-theme-bg text-theme-text transition-colors duration-300">
				<ThemeProvider>
					<ToastProvider>
						<CartProvider>
							{clientConfig.features.showSplashScreen && <SplashScreen />}
							<Header />
							<main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
								{children}
							</main>
							<Footer />
							<MobileNav />
							<FloatingActions />
						</CartProvider>
					</ToastProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
