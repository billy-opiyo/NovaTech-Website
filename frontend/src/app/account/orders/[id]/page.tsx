"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getOrderById, Order } from "@/services/orders"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

export default function OrderDetailPage() {
	const store = useStoreContext()
	const { id } = useParams<{ id: string }>()
	const [order, setOrder] = useState<Order | null>(null)
	const [error, setError] = useState("")

	useEffect(() => { if (id) getOrderById(id).then(setOrder).catch((reason) => setError(reason.message || "Unable to load order")) }, [id])
	if (error) return <div className="mx-auto max-w-2xl py-20 text-center text-red-500">{error}</div>
	if (!order) return <div className="mx-auto max-w-5xl py-20 text-center text-gray-500">Loading order…</div>

	return <div className="mx-auto max-w-5xl space-y-6 py-8"><Link href={getStoreRouteHref(store, "/account/orders")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary"><ArrowLeft size={16}/> Back to orders</Link><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-bold">Order #{order.id.slice(-8).toUpperCase()}</h1><p className="mt-2 text-gray-500">Placed {new Date(order.createdAt).toLocaleString()}</p></div><span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{order.status.replaceAll("_", " ")}</span></div><div className="grid gap-6 lg:grid-cols-[1fr_280px]"><section className="glass-card divide-y divide-gray-200 p-5 dark:divide-gray-700">{order.items.map((item) => <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0"><div className="flex-1"><h2 className="font-semibold">{item.product?.name || "Product"}</h2><p className="text-sm text-gray-500">Quantity: {item.quantity}{item.variant ? ` · ${item.variant}` : ""}</p></div><p className="font-medium">KES {(item.price * item.quantity).toLocaleString()}</p></div>)}</section><aside className="glass-card h-fit space-y-3 p-5"><h2 className="font-semibold">Summary</h2><div className="flex justify-between text-sm"><span>Subtotal</span><span>KES {order.subtotal.toLocaleString()}</span></div><div className="flex justify-between text-sm"><span>Shipping</span><span>KES {order.shippingCost.toLocaleString()}</span></div><div className="flex justify-between border-t pt-3 font-bold dark:border-gray-700"><span>Total</span><span>KES {order.total.toLocaleString()}</span></div>{order.trackingNumber && <Link href={getStoreRouteHref(store, `/account/orders/${order.id}/track`)} className="btn-primary mt-3 block text-center">Track delivery</Link>}</aside></div></div>
}
