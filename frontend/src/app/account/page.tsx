"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { Bell, ChevronRight, Heart, LoaderCircle, LogIn, LogOut, MapPin, Package, Settings, ShoppingBag, User, UserPlus } from "lucide-react"
import { Order } from "@/services/orders"
import AccountAvatar from "@/components/account/AccountAvatar"
import { useStoreContext } from "@/lib/store-context"
import { getStoreHomeHref } from "@/lib/store-home"

type SessionUser = { name?: string | null; email?: string | null; image?: string | null }
const links = [{ icon: Package, label: "My Orders", href: "/account/orders" }, { icon: Heart, label: "Wishlist", href: "/account/wishlist" }, { icon: MapPin, label: "Addresses", href: "/account/addresses" }, { icon: Bell, label: "Notifications", href: "/account/notifications" }, { icon: Settings, label: "Account Settings", href: "/account/settings" }]

export default function AccountPage() {
	const [user, setUser] = useState<SessionUser | null>(null)
	const [orders, setOrders] = useState<Order[]>([])
	const [loading, setLoading] = useState(true)
	const [signingOut, setSigningOut] = useState(false)
	const store = useStoreContext()

	async function handleSignOut() {
		setSigningOut(true)
		try {
			await signOut({ callbackUrl: getStoreHomeHref(store) })
		} catch {
			setSigningOut(false)
		}
	}

	useEffect(() => {
		let active = true
		fetch("/api/auth/session")
			.then((response) => response.json())
			.then((session) => {
				if (!active) return
				const nextUser = session.user || null
				setUser(nextUser)
				if (!nextUser) return
				return fetch("/api/orders?limit=3")
					.then((response) => response.ok ? response.json() : null)
					.then((data) => { if (active && data) setOrders(data.orders || []) })
			})
			.catch(() => { if (active) setUser(null) })
			.finally(() => { if (active) setLoading(false) })
		return () => { active = false }
	}, [])

	if (loading) return <div className="mx-auto max-w-md py-20 text-center text-gray-500">Loading account…</div>
	if (!user) return <div className="mx-auto max-w-lg py-12"><div className="glass-card p-8 text-center sm:p-10"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><User size={32} className="text-primary" /></div><h1 className="text-3xl font-bold">Welcome to your account</h1><p className="mt-3 text-gray-500">Sign in to view orders and manage your account, or create a new account to get started.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><Link href="/auth/signin?callbackUrl=%2Faccount" className="btn-primary inline-flex items-center justify-center gap-2"><LogIn size={18} /> Sign In</Link><Link href="/auth/signup?callbackUrl=%2Faccount" className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2 font-semibold text-primary transition hover:bg-primary/10"><UserPlus size={18} /> Sign Up</Link></div></div></div>
	return <div className="space-y-8"><h1 className="text-3xl font-bold">My Account</h1><div className="grid gap-8 lg:grid-cols-3"><aside><div className="glass-card p-6 text-center"><AccountAvatar name={user?.name} email={user?.email} image={user?.image} className="mx-auto mb-4 h-20 w-20 text-2xl"/><h2 className="text-xl font-semibold">{user?.name || "Customer"}</h2><p className="text-sm text-gray-500">{user?.email || ""}</p><button type="button" disabled={signingOut} aria-busy={signingOut} onClick={() => void handleSignOut()} className="mt-4 inline-flex items-center gap-1 text-sm text-red-500 disabled:opacity-60">{signingOut ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <LogOut size={14} aria-hidden="true"/>}{signingOut ? "Signing out…" : "Sign Out"}</button></div><div className="mt-6 space-y-2">{links.map(({ icon: Icon, label, href }) => <Link key={href} href={href} className="glass-card flex items-center justify-between p-4 transition hover:bg-white/20"><span className="flex items-center gap-3"><Icon size={20} className="text-primary"/>{label}</span><ChevronRight size={16} className="text-gray-400"/></Link>)}</div></aside><section className="lg:col-span-2"><div className="glass-card p-6"><div className="mb-6 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-semibold"><ShoppingBag className="text-primary"/> Recent Orders</h2><Link href="/account/orders" className="text-sm text-primary">View all</Link></div>{orders.length ? <div className="space-y-3">{orders.map((order) => <Link key={order.id} href={`/account/orders/${order.id}`} className="flex items-center justify-between rounded-xl bg-black/5 p-4 dark:bg-white/5"><div><p className="font-semibold">#{order.id.slice(-8).toUpperCase()}</p><p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{order.status.replaceAll("_", " ")}</span><b>KES {order.total.toLocaleString()}</b></Link>)}</div> : <p className="py-8 text-center text-gray-500">No orders yet. <Link href="/products" className="text-primary">Start shopping.</Link></p>}</div></section></div></div>
}
