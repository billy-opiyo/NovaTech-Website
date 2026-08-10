import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { CartProvider } from "@/lib/cartContext"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import MobileNav from "@/components/layout/MobileNav"
import FloatingActions from "@/components/layout/FloatingActions"

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
				<link rel="icon" href="/favicon.ico" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, viewport-fit=cover"
				/>
				<meta name="theme-color" content="#0070f3" />
			</head>
			<body className="min-h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text transition-colors duration-300">
				<ThemeProvider>
					<CartProvider>
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
