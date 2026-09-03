"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "@/components/providers/ThemeProvider"
import SearchOverlay from "@/components/search/SearchOverlay"
import NotificationCenter from "@/components/notifications/NotificationCenter"
import { ChevronDown, LoaderCircle, LogOut, Moon, Sun, ShoppingCart, Menu, User, UserRound, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useCart } from "@/lib/cartContext"
import { useStoreContext } from "@/lib/store-context"
import { signOut, useSession } from "next-auth/react"
import AccountAvatar from "@/components/account/AccountAvatar"
import { getStoreHomeHref, getStoreRouteHref } from "@/lib/store-home"

const platformNavigation = [
	// Explicitly select the platform context so a remembered merchant store
	// cannot turn these links into the merchant homepage.
	{ name: "Home", href: "/?platformHome=1" },
	{ name: "Browse Stores", href: "/stores?all=1" },
	{ name: "Plans", href: "/?platformHome=1#plans" },
	{ name: "Create Store", href: "/onboarding" },
]

export default function Header() {
	const { theme, toggleTheme } = useTheme()
	const { itemCount } = useCart()
	const store = useStoreContext()
	const { data: session, status: sessionStatus } = useSession()
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const homeHref = getStoreHomeHref(store)
	const navigation = store.isPlatformHome ? platformNavigation : store.navigation.map((link) => ({ ...link, href: getStoreRouteHref(store, link.href) }))
	const platformAccountHref = `/auth/signin?callbackUrl=${encodeURIComponent("/?platformHome=1")}`
	const isSignedIn = sessionStatus === "authenticated" && Boolean(session?.user)
	const accountName = session?.user?.name || session?.user?.email || "Account"

	return (
		<header className="site-header sticky top-0 z-[60] glass navy-glass backdrop-blur-lg border-b border-white/10">
			<div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
				<div className="flex items-center justify-between gap-1 py-3 sm:gap-2 sm:py-4">
					{/* Logo */}
					<Link href={homeHref} className="flex shrink-0 items-center gap-2">
						<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-lg shadow-primary/20 sm:h-11 sm:w-11">
							<Image
										src={theme === "light" ? "/images/NovaTech icon 2 light.png" : store.brand.logo}
										alt={store.brand.logoAlt}
								fill
								sizes="(max-width: 640px) 40px, 44px"
								className="object-contain"
							/>
						</div>
						<span
							className={`whitespace-nowrap text-base font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent sm:text-xl lg:text-2xl ${store.isPlatformHome ? "uppercase" : ""}`}
							style={store.isPlatformHome ? { fontFamily: '"Times New Roman", Times, serif' } : undefined}
						>
							{store.brand.name}
						</span>
					</Link>
				<nav className="hidden gap-3 md:flex lg:gap-6">
					{navigation.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
							>
								{link.name}
							</Link>
						))}
					</nav>

					{/* Right side icons */}
					<div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
						<button
							onClick={toggleTheme}
							className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
							aria-label="Toggle dark mode"
						>
							{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
						</button>
						{store.isPlatformHome && (isSignedIn ? <>
							<PlatformAccountMenu name={session?.user?.name} email={session?.user?.email} image={session?.user?.image} accountName={accountName} mobile />
							<PlatformAccountMenu name={session?.user?.name} email={session?.user?.email} image={session?.user?.image} accountName={accountName} />
						</> : <>
							<Link href={platformAccountHref} aria-label="Sign in" className="inline-flex items-center justify-center rounded-full p-2 text-gray-700 transition hover:bg-white/10 dark:text-white sm:hidden"><User size={20} /></Link>
							<Link href={platformAccountHref} className="hidden items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 sm:inline-flex">Get started</Link>
						</>)}
						{!store.isPlatformHome && <>
							<SearchOverlay />
							<NotificationCenter />
							<Link href={getStoreRouteHref(store, "/cart")} aria-label="Open shopping cart" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition relative"><ShoppingCart size={20} />{itemCount > 0 && <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{itemCount}</span>}</Link>
							<Link href={getStoreRouteHref(store, "/account")} aria-label={`Open ${accountName}'s account`} title={isSignedIn ? accountName : "Account"} className="rounded-full p-1.5 text-gray-700 transition hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700">{isSignedIn ? <AccountAvatar name={session?.user?.name} email={session?.user?.email} image={session?.user?.image} className="h-8 w-8" /> : <User size={20} />}</Link>
						</>}

						{/* Mobile menu toggle */}
						<button
							className="md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						className="md:hidden glass border-t border-white/10 overflow-hidden"
					>
						<div className="px-4 py-4 flex flex-col gap-3">
						{navigation.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className="block text-gray-700 dark:text-gray-300 hover:text-primary"
									onClick={() => setMobileMenuOpen(false)}
								>
									{link.name}
								</Link>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</header>
	)
}

function PlatformAccountMenu({
	name,
	email,
	image,
	accountName,
	mobile = false,
}: {
	name?: string | null
	email?: string | null
	image?: string | null
	accountName: string
	mobile?: boolean
}) {
	const [open, setOpen] = useState(false)
	const [signingOut, setSigningOut] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const closeOnOutsideClick = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
		}
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false)
		}
		document.addEventListener("mousedown", closeOnOutsideClick)
		document.addEventListener("keydown", closeOnEscape)
		return () => {
			document.removeEventListener("mousedown", closeOnOutsideClick)
			document.removeEventListener("keydown", closeOnEscape)
		}
	}, [open])

	async function handleSignOut() {
		setSigningOut(true)
		try {
			await signOut({ redirect: false })
			setOpen(false)
		} catch {
			setSigningOut(false)
		}
	}

	return (
		<div ref={menuRef} className={`relative ${mobile ? "sm:hidden" : "hidden sm:block"}`}>
			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={`Open ${accountName}'s account menu`}
				title={accountName}
				className={`inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-primary/10 dark:text-white ${mobile ? "rounded-full p-1.5" : ""}`}
			>
				<AccountAvatar name={name} email={email} image={image} className={mobile ? "h-7 w-7" : "h-7 w-7"} />
				{!mobile && <><span className="max-w-36 truncate text-left leading-tight text-gray-700 dark:text-white">{accountName}</span><ChevronDown size={16} aria-hidden="true" /></>}
			</button>
			{open && (
				<div role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-52 rounded-xl border border-gray-200 bg-white p-2 text-gray-800 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-white">
					<Link href="/account" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800">
						<UserRound size={17} aria-hidden="true" />
						Account
					</Link>
					<button type="button" role="menuitem" disabled={signingOut} onClick={() => void handleSignOut()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30">
						{signingOut ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <LogOut size={17} aria-hidden="true" />}
						{signingOut ? "Signing out…" : "Sign out"}
					</button>
				</div>
			)}
		</div>
	)
}
