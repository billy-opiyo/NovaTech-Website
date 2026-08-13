import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { CartProvider } from "@/lib/cartContext"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import MobileNav from "@/components/layout/MobileNav"
import FloatingActions from "@/components/layout/FloatingActions"
import SplashScreen from "@/components/layout/SplashScreen"

export const metadata: Metadata = {
	title: {
		default: "NovaTech Store - Kenya's Electronics Store",
		template: "%s | NovaTech Store",
	},
	description:
		"Shop genuine phones, laptops, accessories with warranty. Fast delivery across Kenya.",
	keywords:
		"electronics, Kenya, phones, laptops, accessories, M-Pesa, online shopping",
	openGraph: {
		type: "website",
		locale: "en_KE",
		url: "https://novatechstore.co.ke",
		siteName: "NovaTech Store",
		title: "NovaTech Store - Kenya's Electronics Store",
		description:
			"Shop genuine phones, laptops, accessories with warranty. Fast delivery across Kenya.",
	},
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" suppressHydrationWarning>
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
				<link rel="icon" href="/favicon.ico" />
				<link rel="preconnect" href="https://images.unsplash.com" />
				<link rel="dns-prefetch" href="https://images.unsplash.com" />
				<link rel="preconnect" href="https://images.pexels.com" />
				<link rel="dns-prefetch" href="https://images.pexels.com" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, viewport-fit=cover"
				/>
				<meta name="theme-color" content="#0f172a" />
			</head>
			<body className="min-h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text transition-colors duration-300">
				<ThemeProvider>
					<CartProvider>
						<SplashScreen />
						<Header />
						<main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
							{children}
						</main>
						<Footer />
						<MobileNav />
						<FloatingActions />
					</CartProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
