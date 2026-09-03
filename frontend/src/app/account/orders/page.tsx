"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package, ChevronRight } from "lucide-react"
import { getMyOrders, Order } from "@/services/orders"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

function label(status: string) { return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) }

export default function OrdersPage() {
	const store = useStoreContext()
	const [orders, setOrders] = useState<Order[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		getMyOrders().then((result) => setOrders(result.orders)).catch((reason) => setError(reason.message || "Unable to load orders")).finally(() => setLoading(false))
	}, [])

	return <div className="mx-auto max-w-5xl space-y-6 py-8">
		<div><h1 className="text-3xl font-bold">My Orders</h1><p className="mt-2 text-gray-500">View your order history and track deliveries.</p></div>
		{loading && <div className="glass-card p-8 text-center text-gray-500">Loading orders…</div>}
		{error && <div className="glass-card p-8 text-center text-red-500">{error}</div>}
		{!loading && !error && orders.length === 0 && <div className="glass-card p-10 text-center"><Package className="mx-auto mb-3 text-gray-400" size={42}/><h2 className="text-xl font-semibold">No orders yet</h2><Link href={getStoreRouteHref(store, "/products")} className="btn-primary mt-5 inline-flex">Start shopping</Link></div>}
		<div className="space-y-4">{orders.map((order) => <Link key={order.id} href={getStoreRouteHref(store, `/account/orders/${order.id}`)} className="glass-card flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Order #{order.id.slice(-8).toUpperCase()}</p><p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{label(order.status)}</span><p className="mt-2 text-sm text-gray-500">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p></div><div className="text-left sm:text-right"><p className="font-semibold">KES {order.total.toLocaleString()}</p><ChevronRight className="mt-1 text-gray-400 sm:ml-auto" size={18}/></div></Link>)}</div>
	</div>
}
