"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Bell, CheckCheck, Package, Tag, Truck, X } from "lucide-react"
import clsx from "clsx"

type Notification = {
	id: string
	type: string
	message: string
	read: boolean
	createdAt: string
}

function notificationIcon(type: string) {
	if (type.includes("ORDER")) return <Package size={18} className="text-blue-500" />
	if (type.includes("DELIVERY")) return <Truck size={18} className="text-green-500" />
	if (type.includes("PROMO")) return <Tag size={18} className="text-orange-500" />
	return <AlertCircle size={18} className="text-purple-500" />
}

export default function NotificationCenter() {
	const [isOpen, setIsOpen] = useState(false)
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [loading, setLoading] = useState(false)
	const [loaded, setLoaded] = useState(false)
	const [requiresSignIn, setRequiresSignIn] = useState(false)
	const [error, setError] = useState("")

	const unreadCount = notifications.filter((notification) => !notification.read).length

	useEffect(() => {
		if (!isOpen || loaded) return
		setLoading(true)
		fetch("/api/account/notifications", { cache: "no-store" })
			.then(async (response) => {
				if (response.status === 401) {
					setRequiresSignIn(true)
					return { notifications: [] }
				}
				if (!response.ok) throw new Error("Unable to load notifications")
				return response.json() as Promise<{ notifications: Notification[] }>
			})
			.then((data) => setNotifications(data.notifications || []))
			.catch((reason: Error) => setError(reason.message))
			.finally(() => {
				setLoaded(true)
				setLoading(false)
			})
	}, [isOpen, loaded])

	async function markRead(id?: string) {
		const response = await fetch("/api/account/notifications", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(id ? { id } : {}),
		})
		if (!response.ok) {
			setError("Unable to update notifications")
			return
		}
		setNotifications((items) => id
			? items.map((item) => item.id === id ? { ...item, read: true } : item)
			: items.map((item) => ({ ...item, read: true })))
	}

	return (
		<div className="relative">
			<button
				type="button"
				aria-label="Open notifications"
				aria-expanded={isOpen}
				onClick={() => setIsOpen((open) => !open)}
				className="relative rounded-full p-2 transition hover:bg-gray-200 dark:hover:bg-gray-700"
			>
				<Bell size={20} />
				{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
			</button>

			<AnimatePresence>
				{isOpen && <>
					<motion.button type="button" aria-label="Close notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 cursor-default" onClick={() => setIsOpen(false)} />
					<motion.div initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.97 }} className="fixed inset-x-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden glass-card sm:left-auto sm:right-4 sm:w-96">
						<div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700"><h2 className="font-semibold">Notifications</h2><div className="flex items-center gap-2">{unreadCount > 0 && <button type="button" onClick={() => markRead()} className="text-xs text-primary hover:underline">Mark all read</button>}<button type="button" aria-label="Close notifications" onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"><X size={16} /></button></div></div>
						<div className="min-h-0 flex-1 overflow-y-auto">
							{loading && <p className="p-10 text-center text-sm text-gray-500">Loading notifications…</p>}
							{!loading && requiresSignIn && <div className="p-8 text-center"><Bell className="mx-auto mb-3 text-gray-400" size={30} /><p className="text-sm text-gray-500">Sign in to view your notifications.</p><Link href="/auth/signin?callbackUrl=%2Faccount%2Fnotifications" onClick={() => setIsOpen(false)} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Sign in</Link></div>}
							{!loading && !requiresSignIn && error && <p className="p-8 text-center text-sm text-red-500">{error}</p>}
							{!loading && !requiresSignIn && !error && notifications.length === 0 && <div className="p-10 text-center"><Bell className="mx-auto mb-3 text-gray-400" size={30} /><p className="text-sm text-gray-500">No notifications yet.</p></div>}
							{!loading && !requiresSignIn && !error && notifications.map((notification) => <button type="button" key={notification.id} onClick={() => markRead(notification.id)} className={clsx("w-full border-b border-gray-100 p-4 text-left transition hover:bg-black/5 dark:border-gray-800 dark:hover:bg-white/5", !notification.read && "bg-primary/5")}><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">{notificationIcon(notification.type)}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{notification.type.replaceAll("_", " ")}</p>{!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}</div><p className="mt-1 line-clamp-2 text-xs text-gray-500">{notification.message}</p><time className="mt-1 block text-xs text-gray-400">{new Date(notification.createdAt).toLocaleString()}</time></div></div></button>)}
						</div>
						<div className="border-t border-gray-200 p-3 dark:border-gray-700"><Link href="/account/notifications" onClick={() => setIsOpen(false)} className="block w-full text-center text-sm text-primary hover:underline">View all notifications</Link></div>
					</motion.div>
				</>}
			</AnimatePresence>
		</div>
	)
}
