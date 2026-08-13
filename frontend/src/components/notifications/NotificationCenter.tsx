"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, Package, Tag, AlertCircle, Truck } from "lucide-react"
import clsx from "clsx"

interface Notification {
	id: string
	type: "order" | "promo" | "system" | "delivery"
	title: string
	message: string
	time: string
	read: boolean
}

export default function NotificationCenter() {
	const [isOpen, setIsOpen] = useState(false)
	const [notifications, setNotifications] = useState<Notification[]>([])

	const unreadCount = notifications.filter((n) => !n.read).length

	useEffect(() => {
		if (!isOpen) return
		const timeout = window.setTimeout(() => setIsOpen(false), 4000)
		return () => window.clearTimeout(timeout)
	}, [isOpen])

	const markAsRead = (id: string) => {
		setNotifications((prev) =>
			prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
		)
	}

	const markAllRead = () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
	}

	const getIcon = (type: string) => {
		switch (type) {
			case "order":
				return <Package size={18} className="text-blue-500" />
			case "delivery":
				return <Truck size={18} className="text-green-500" />
			case "promo":
				return <Tag size={18} className="text-orange-500" />
			case "system":
				return <AlertCircle size={18} className="text-purple-500" />
			default:
				return <Bell size={18} className="text-gray-500" />
		}
	}

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
			>
				<Bell size={20} />
				{unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
						{unreadCount}
					</span>
				)}
			</button>

			<AnimatePresence>
				{isOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-40"
							onClick={() => setIsOpen(false)}
						/>
						<motion.div
							initial={{ opacity: 0, y: -10, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -10, scale: 0.95 }}
							className="fixed inset-x-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden glass-card sm:left-auto sm:right-4 sm:w-96"
						>
							<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
								<h3 className="font-semibold">Notifications</h3>
								<div className="flex items-center gap-2">
									{unreadCount > 0 && (
										<button
											onClick={markAllRead}
											className="text-xs text-primary hover:underline"
										>
											Mark all read
										</button>
									)}
									<button
										onClick={() => setIsOpen(false)}
										className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
									>
										<X size={16} />
									</button>
								</div>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto">
								{notifications.length === 0 ? (
									<div className="text-center py-12">
										<Bell className="mx-auto mb-3 text-gray-400" size={32} />
										<p className="text-gray-500 text-sm">
											No notifications yet
										</p>
									</div>
								) : (
									notifications.map((notification) => (
										<button
											key={notification.id}
											onClick={() => markAsRead(notification.id)}
											className={clsx(
												"w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 transition hover:bg-black/5 dark:hover:bg-white/5",
												!notification.read && "bg-primary/5",
											)}
										>
											<div className="flex gap-3">
												<div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
													{getIcon(notification.type)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between gap-2">
														<p className="font-medium text-sm">
															{notification.title}
														</p>
														{!notification.read && (
															<span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
														)}
													</div>
													<p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
														{notification.message}
													</p>
													<p className="text-xs text-gray-400 mt-1">
														{notification.time}
													</p>
												</div>
											</div>
										</button>
									))
								)}
							</div>

							<div className="p-3 border-t border-gray-200 dark:border-gray-700">
								<button className="w-full text-center text-sm text-primary hover:underline">
									View All Notifications
								</button>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	)
}
