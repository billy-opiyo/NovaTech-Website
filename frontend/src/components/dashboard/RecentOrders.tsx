"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Clock, Truck } from "lucide-react"
import clsx from "clsx"
import { Order } from "@/services/orders"

function getStatusBadge(status: string) {
	return { DELIVERED: "bg-green-500/20 text-green-600", PROCESSING: "bg-blue-500/20 text-blue-600", PENDING: "bg-yellow-500/20 text-yellow-600", CANCELLED: "bg-red-500/20 text-red-600" }[status] || "bg-gray-500/20 text-gray-600"
}

function getStatusIcon(status: string) {
	if (status === "DELIVERED") return <CheckCircle2 size={14} />
	if (status === "PROCESSING") return <Clock size={14} />
	if (status === "CANCELLED") return <Truck size={14} />
	return <AlertCircle size={14} />
}

export default function RecentOrders() {
	const [orders, setOrders] = useState<Order[]>([])
	const [state, setState] = useState<"loading" | "ready" | "error">("loading")

	useEffect(() => {
		fetch("/api/admin/orders?limit=5")
			.then(async (response) => {
				if (!response.ok) throw new Error("Unable to load recent orders")
				return response.json()
			})
			.then((data) => { setOrders(data.orders ?? []); setState("ready") })
			.catch(() => setState("error"))
	}, [])

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6 lg:col-span-2">
			<div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-bold">Recent Orders</h2><p className="mt-1 text-sm text-gray-500">Latest live transactions</p></div><Link href="/admin/orders" className="text-sm text-primary hover:underline">View All</Link></div>
			{state === "loading" && <p className="py-8 text-center text-sm text-gray-500">Loading orders…</p>}
			{state === "error" && <p className="py-8 text-center text-sm text-red-500">Unable to load recent orders.</p>}
			{state === "ready" && !orders.length && <p className="py-8 text-center text-sm text-gray-500">No orders recorded yet.</p>}
			{state === "ready" && orders.length > 0 && <div className="space-y-4">{orders.map((order) => { const product = order.items[0]?.product?.name || "Order"; return <Link key={order.id} href="/admin/orders" className="flex items-center gap-4 rounded-xl p-2 transition hover:bg-black/5 dark:hover:bg-white/5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product}</p><p className="text-xs text-gray-500">{order.shippingAddress?.fullName || "Guest"} · {new Date(order.createdAt).toLocaleString()}</p></div><div className="flex-shrink-0 text-right"><p className="text-sm font-semibold">KES {order.total.toLocaleString()}</p><span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", getStatusBadge(order.status))}>{getStatusIcon(order.status)}{order.status.replaceAll("_", " ")}</span></div></Link> })}</div>}
		</motion.div>
	)
}
