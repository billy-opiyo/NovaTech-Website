"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bell, CheckCheck } from "lucide-react"

type Notification = { id: string; type: string; message: string; read: boolean; createdAt: string }

export default function NotificationsPage() {
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")

	const load = () => fetch("/api/account/notifications").then(async (response) => { if (!response.ok) throw new Error("Unable to load notifications."); return response.json() }).then((data) => setNotifications(data.notifications || [])).catch((reason) => setError(reason.message)).finally(() => setLoading(false))
	useEffect(() => { load() }, [])

	async function markRead(id?: string) {
		await fetch("/api/account/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : {}) })
		setNotifications((items) => id ? items.map((item) => item.id === id ? { ...item, read: true } : item) : items.map((item) => ({ ...item, read: true })))
	}

	return <div className="mx-auto max-w-3xl space-y-6 py-6 sm:py-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/account" className="text-sm text-gray-500 hover:text-primary">Back to account</Link><h1 className="mt-2 text-3xl font-bold">Notifications</h1></div>{notifications.some((item) => !item.read) && <button onClick={() => markRead()} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><CheckCheck size={17} /> Mark all as read</button>}</div>{loading ? <p className="py-10 text-center text-gray-500">Loading notifications…</p> : error ? <p className="glass-card p-6 text-red-500">{error}</p> : notifications.length === 0 ? <div className="glass-card p-10 text-center text-gray-500"><Bell className="mx-auto mb-3 text-primary" size={32} />You have no notifications.</div> : <div className="space-y-3">{notifications.map((item) => <article key={item.id} className={`glass-card flex gap-4 p-5 ${item.read ? "opacity-70" : "border-primary/40"}`}><Bell className="mt-1 shrink-0 text-primary" size={20} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-semibold">{item.type.replaceAll("_", " ")}</h2><time className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.message}</p>{!item.read && <button onClick={() => markRead(item.id)} className="mt-3 text-sm text-primary hover:underline">Mark as read</button>}</div></article>)}</div>}</div>
}
