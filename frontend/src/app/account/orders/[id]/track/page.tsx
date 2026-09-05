"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams } from "next/navigation"
import { Calendar, Package, Truck, CheckCircle2, Clock, MapPin } from "lucide-react"
import clsx from "clsx"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

interface Order {
	id: string
	status: string
	trackingNumber?: string
	estimatedDelivery?: string
	customerName: string
	customerEmail: string
	customerPhone: string
	shippingAddress: {
		county: string
		town: string
		streetAddress: string
	}
	courierService?: string
	trackingHistory: Array<{
		status: string
		timestamp: string
		description: string
		location?: string
	}>
}

const statusSteps = [
	{ key: "pending", label: "Order Placed", icon: Package },
	{ key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
	{ key: "processing", label: "Processing", icon: Clock },
	{ key: "shipped", label: "Shipped", icon: Truck },
	{ key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
	{ key: "delivered", label: "Delivered", icon: CheckCircle2 },
]

const statusLabels: Record<string, string> = {
	pending: "Pending",
	confirmed: "Confirmed",
	processing: "Processing",
	shipped: "Shipped",
	out_for_delivery: "Out for Delivery",
	delivered: "Delivered",
	cancelled: "Cancelled",
}

function getStatusIndex(status: string): number {
	return statusSteps.findIndex((step) => step.key === status)
}

function formatDate(dateString: string): string {
	const date = new Date(dateString)
	return date.toLocaleDateString("en-KE", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export default function OrderTrackingPage() {
	const params = useParams<{ id: string }>()
	const store = useStoreContext()
	const [order, setOrder] = useState<Order | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchTrackingData = useCallback(async (id: string) => {
		try {
			setLoading(true)
			setError(null)
			const response = await fetch(getStoreRouteHref(store, `/api/orders/${encodeURIComponent(id)}/tracking`))

			if (!response.ok) {
				if (response.status === 404) {
					window.location.href = getStoreRouteHref(store, "/account/orders")
					return
				}
				throw new Error("Failed to fetch tracking data")
			}

			const data = await response.json()
			setOrder(data)
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Unable to load order")
			console.error("Error fetching tracking data:", err)
		} finally {
			setLoading(false)
		}
	}, [store])

	useEffect(() => {
		const id = params.id
		if (id) {
			void fetchTrackingData(id)
		} else {
			setLoading(false)
			setError("Order ID not found")
		}
	}, [fetchTrackingData, params.id])

	if (loading) {
		return (
			<div className="max-w-5xl mx-auto space-y-6 py-8 px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-lg text-gray-500">Loading tracking information...</div>
				</div>
			</div>
		)
	}

	if (error || !order) {
		return (
			<div className="max-w-5xl mx-auto space-y-6 py-8 px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-lg text-red-500">{error || "Order not found"}</div>
				</div>
			</div>
		)
	}

	const currentStatusIndex = getStatusIndex(order.status)
	const isCancelled = order.status === "cancelled"

	return (
		<div className="max-w-5xl mx-auto space-y-6 py-8 px-4 sm:px-6 lg:px-8">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold">Track Order</h1>
				<p className="text-sm text-gray-500 mt-2">
					Order #{order.id.slice(-8).toUpperCase()}
				</p>
			</div>
				<div className="flex items-center gap-3">
					<a href={getStoreRouteHref(store, `/account/orders/${order.id}`)} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition text-sm font-medium">
						View Order Details
					</a>
					{!isCancelled && order.trackingNumber && (
						<a href={`tel:+254${order.customerPhone.slice(1)}`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition text-sm font-medium">
							<span>Contact Support</span>
						</a>
					)}
				</div>
			</div>

			{!isCancelled ? (
				<div>
					<div className="glass-card p-6 md:p-8">
						<h2 className="text-xl font-bold mb-8">Order Status</h2>
						<div className="relative">
							<div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

							<div className="space-y-8">
								{statusSteps.map((step, index) => {
									const isCompleted = index <= currentStatusIndex
									const isCurrent = index === currentStatusIndex
									const StepIcon = step.icon

									return (
										<div key={step.key} className="relative flex gap-4 md:gap-6">
											<div
												className={clsx(
													"relative z-10 flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full border-2 flex-shrink-0",
													isCompleted ? "bg-primary border-primary text-white" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400",
												)}
											>
												<StepIcon size={24} />
											</div>

											<div className="flex-1 pt-2">
												<div className="flex items-start justify-between">
													<div>
														<h3 className={clsx("text-lg font-semibold", isCurrent ? "text-primary" : "text-gray-700 dark:text-gray-300")}>
															{step.label}
														</h3>
														{isCurrent && order.trackingHistory && order.trackingHistory.length > 0 && (
															<p className="text-sm text-gray-500 mt-1">{order.trackingHistory[order.trackingHistory.length - 1].description}</p>
														)}
														{isCurrent && order.estimatedDelivery && (
															<p className="text-sm text-gray-500 mt-1">Estimated: {formatDate(order.estimatedDelivery)}</p>
														)}
													</div>
													{isCurrent && (
														<span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Current</span>
													)}
												</div>
											</div>
										</div>
									)
								})}
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="glass-card p-6">
							<h3 className="text-lg font-semibold mb-4">Tracking Information</h3>
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<Truck className="text-gray-400 mt-1" size={20} />
									<div>
										<p className="text-xs text-gray-500">Tracking Number</p>
										<p className="font-mono font-semibold text-sm">{order.trackingNumber || "Not assigned yet"}</p>
									</div>
								</div>
								{order.courierService && (
									<div className="flex items-start gap-3">
										<Package className="text-gray-400 mt-1" size={20} />
										<div>
											<p className="text-xs text-gray-500">Courier Service</p>
											<p className="font-semibold text-sm">{order.courierService}</p>
										</div>
									</div>
								)}
								<div className="flex items-start gap-3">
									<Calendar className="text-gray-400 mt-1" size={20} />
									<div>
										<p className="text-xs text-gray-500">Estimated Delivery</p>
										<p className="font-semibold text-sm">{order.estimatedDelivery ? formatDate(order.estimatedDelivery) : "Not available"}</p>
									</div>
								</div>
							</div>
						</div>

						<div className="glass-card p-6">
							<h3 className="text-lg font-semibold mb-4">Delivery Address</h3>
							<div className="space-y-2">
								<div className="flex items-start gap-3">
									<MapPin className="text-gray-400 mt-1" size={20} />
									<div>
										<p className="font-semibold text-sm">{order.customerName}</p>
										<p className="text-sm text-gray-600 dark:text-gray-400">{order.shippingAddress.streetAddress}</p>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											{order.shippingAddress.town}, {order.shippingAddress.county}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{order.trackingHistory && order.trackingHistory.length > 0 && (
						<div className="glass-card p-6">
							<h3 className="text-lg font-semibold mb-6">Tracking History</h3>
							<div className="space-y-4">
								{order.trackingHistory
									.slice()
									.reverse()
									.map((event, index) => (
										<div key={index} className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
											<div className="flex-shrink-0 w-24">
												<p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
											</div>
											<div className="flex-1">
												<p className="font-medium text-sm">{event.description}</p>
												{event.location && (
													<p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
														<MapPin size={12} />
														{event.location}
													</p>
												)}
											</div>
											<div className="flex-shrink-0">
												<span
													className={clsx(
														"px-2 py-1 rounded-full text-xs font-medium capitalize",
														event.status === "delivered"
															? "bg-green-500/20 text-green-700"
															: event.status === "out_for_delivery"
																? "bg-amber-500/20 text-amber-700"
																: "bg-blue-500/20 text-blue-700",
													)}
												>
													{statusLabels[event.status as Order["status"]]}
												</span>
											</div>
										</div>
									))}
							</div>
						</div>
					)}

					<div className="glass-card p-6">
						<h3 className="text-lg font-semibold mb-4">Notifications</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
							You will receive SMS and WhatsApp notifications at key milestones:
						</p>
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm">
								<CheckCircle2 size={16} className="text-green-500" />
								<span>Order confirmation</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<CheckCircle2 size={16} className="text-green-500" />
								<span>Payment confirmation</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<CheckCircle2 size={16} className="text-green-500" />
								<span>Order shipped with tracking number</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<CheckCircle2 size={16} className="text-green-500" />
								<span>Out for delivery</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<CheckCircle2 size={16} className="text-green-500" />
								<span>Delivered</span>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="glass-card p-8 text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-4">
						<Package size={32} />
					</div>
					<h2 className="text-2xl font-bold mb-2">Order Cancelled</h2>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						This order has been cancelled. If you have any questions, please contact support.
					</p>
					<a href={getStoreRouteHref(store, "/contact")} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition">
						Contact Support
					</a>
				</div>
			)}
		</div>
	)
}
