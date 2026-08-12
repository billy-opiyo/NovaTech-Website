"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { Bell, ChevronRight, Heart, LogOut, MapPin, Package, Settings, ShoppingBag, User } from "lucide-react"
import { Order } from "@/services/orders"

type SessionUser = { name?: string | null; email?: string | null; image?: string | null }
const links = [{ icon: Package, label: "My Orders", href: "/account/orders" }, { icon: Heart, label: "Wishlist", href: "/account/wishlist" }, { icon: MapPin, label: "Addresses", href: "/account/addresses" }, { icon: Bell, label: "Notifications", href: "/account/notifications" }, { icon: Settings, label: "Account Settings", href: "/account/settings" }]

export default function AccountPage() {
	const [user, setUser] = useState<SessionUser | null>(null)
	const [orders, setOrders] = useState<Order[]>([])
	useEffect(() => { fetch("/api/auth/session").then((response) => response.json()).then((session) => setUser(session.user || null)); fetch("/api/orders?limit=3").then((response) => response.ok ? response.json() : null).then((data) => data && setOrders(data.orders || [])) }, [])
	return <div className="space-y-8"><h1 className="text-3xl font-bold">My Account</h1><div className="grid gap-8 lg:grid-cols-3"><aside><div className="glass-card p-6 text-center"><div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20"><User size={40} className="text-primary"/></div><h2 className="text-xl font-semibold">{user?.name || "Customer"}</h2><p className="text-sm text-gray-500">{user?.email || ""}</p><button onClick={() => signOut({ callbackUrl: "/" })} className="mt-4 inline-flex items-center gap-1 text-sm text-red-500"><LogOut size={14}/> Sign Out</button></div><div className="mt-6 space-y-2">{links.map(({ icon: Icon, label, href }) => <Link key={href} href={href} className="glass-card flex items-center justify-between p-4 transition hover:bg-white/20"><span className="flex items-center gap-3"><Icon size={20} className="text-primary"/>{label}</span><ChevronRight size={16} className="text-gray-400"/></Link>)}</div></aside><section className="lg:col-span-2"><div className="glass-card p-6"><div className="mb-6 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-semibold"><ShoppingBag className="text-primary"/> Recent Orders</h2><Link href="/account/orders" className="text-sm text-primary">View all</Link></div>{orders.length ? <div className="space-y-3">{orders.map((order) => <Link key={order.id} href={`/account/orders/${order.id}`} className="flex items-center justify-between rounded-xl bg-black/5 p-4 dark:bg-white/5"><div><p className="font-semibold">#{order.id.slice(-8).toUpperCase()}</p><p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{order.status.replaceAll("_", " ")}</span><b>KES {order.total.toLocaleString()}</b></Link>)}</div> : <p className="py-8 text-center text-gray-500">No orders yet. <Link href="/products" className="text-primary">Start shopping.</Link></p>}</div></section></div></div>
}
