"use client"

import Image from "next/image"
import type { CartItem } from "@/lib/cartContext"

interface OrderSummaryProps {
	items: CartItem[]
	subtotal: number
	deliveryCost: number
	total: number
}

export default function OrderSummary({
	items,
	subtotal,
	deliveryCost,
	total,
}: OrderSummaryProps) {
	return (
		<div className="glass-card p-6 sticky top-24">
			<h3 className="font-semibold text-lg mb-4">Order Summary</h3>
			<div className="space-y-3 max-h-64 overflow-y-auto mb-4">
				{items.map((item) => (
					<div key={item.id} className="flex gap-2 text-sm">
						<div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
							<Image
								src={item.image}
								alt={item.name}
								fill
								className="object-cover"
							/>
						</div>
						<div className="flex-1 min-w-0">
							<p className="truncate">{item.name}</p>
							<p className="text-gray-500">x{item.quantity}</p>
						</div>
						<p className="font-medium">
							KES {(item.price * item.quantity).toLocaleString()}
						</p>
					</div>
				))}
			</div>
			<div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-gray-500">Subtotal</span>
					<span>KES {subtotal.toLocaleString()}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-500">Delivery</span>
					<span>
						{deliveryCost === 0
							? "FREE"
							: `KES ${deliveryCost.toLocaleString()}`}
					</span>
				</div>
				<div className="flex justify-between font-bold text-lg pt-2 border-t">
					<span>Total</span>
					<span>KES {total.toLocaleString()}</span>
				</div>
			</div>
		</div>
	)
}