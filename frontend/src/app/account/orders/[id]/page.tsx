import { notFound } from "next/navigation"
import { Calendar, Package, Truck } from "lucide-react"
import clsx from "clsx"

interface Order {
	id: string
	date: string
	status:
		| "pending"
		| "confirmed"
		| "processing"
		| "shipped"
		| "out_for_delivery"
		| "delivered"
		| "cancelled"
	total: number
	items: number
	trackingNumber?: string
	estimatedDelivery?: string
}

const mockOrders: Order[] = [
	{
		id: "EB-20240815-001",
		date: "2024-08-15",
		status: "delivered",
		total: 174999,
		items: 2,
		trackingNumber: "KN-TRK-12345",
		estimatedDelivery: "2024-08-18",
	},
	{
		id: "EB-20240820-002",
		date: "2024-08-20",
		status: "processing",
		total: 34999,
		items: 1,
		estimatedDelivery: "2024-08-25",
	},
	{
		id: "EB-20240825-003",
		date: "2024-08-25",
		status: "shipped",
		total: 89999,
		items: 3,
		trackingNumber: "KN-TRK-67890",
		estimatedDelivery: "2024-08-30",
	},
	{
		id: "EB-20240826-004",
		date: "2024-08-26",
		status: "out_for_delivery",
		total: 54999,
		items: 1,
		trackingNumber: "KN-TRK-24680",
		estimatedDelivery: "2024-08-28",
	},
	{
		id: "EB-20240810-005",
		date: "2024-08-10",
		status: "delivered",
		total: 124999,
		items: 2,
		trackingNumber: "KN-TRK-13579",
		estimatedDelivery: "2024-08-13",
	},
]

interface Params {
	id: string
}

const statusLabels: Record<Order["status"], string> = {
	pending: "Pending",
	confirmed: "Confirmed",
	processing: "Processing",
	shipped: "Shipped",
	out_for_delivery: "Out for Delivery",
	delivered: "Delivered",
	cancelled: "Cancelled",
}

const statusColor: Record<Order["status"], string> = {
	pending: "bg-yellow-500/20 text-yellow-700",
	confirmed: "bg-blue-500/20 text-blue-700",
	processing: "bg-orange-500/20 text-orange-700",
	shipped: "bg-sky-500/20 text-sky-700",
	out_for_delivery: "bg-amber-500/20 text-amber-700",
	delivered: "bg-green-500/20 text-green-700",
	cancelled: "bg-red-500/20 text-red-700",
}

export default async function AccountOrderPage({
	params,
}: {
	params?: Promise<Params>
}) {
	const resolvedParams = await params
	if (!resolvedParams?.id) {
		notFound()
	}

	const order = mockOrders.find((item) => item.id === resolvedParams.id)
	if (!order) {
		notFound()
	}

	return (
		<div className="max-w-5xl mx-auto space-y-6 py-8 px-4 sm:px-6 lg:px-8">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Order {order.id}</h1>
					<p className="text-sm text-gray-500 mt-2">
						Order details and tracking information.
					</p>
				</div>
				<span
					className={clsx(
						"px-3 py-1 rounded-full text-sm font-semibold",
						statusColor[order.status],
					)}
				>
					{statusLabels[order.status]}
				</span>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="glass-card p-6">
					<h2 className="text-lg font-semibold mb-4">Order summary</h2>
					<div className="space-y-3 text-sm text-gray-700">
						<div className="flex justify-between">
							<span>Order ID</span>
							<span className="font-mono">{order.id}</span>
						</div>
						<div className="flex justify-between">
							<span>Date</span>
							<span>{order.date}</span>
						</div>
						<div className="flex justify-between">
							<span>Items</span>
							<span>{order.items}</span>
						</div>
						<div className="flex justify-between">
							<span>Total</span>
							<span>KES {order.total.toLocaleString()}</span>
						</div>
					</div>
				</div>
				<div className="glass-card p-6">
					<h2 className="text-lg font-semibold mb-4">Delivery</h2>
					<div className="space-y-3 text-sm text-gray-700">
						<div className="flex items-center gap-2">
							<Package size={18} />
							<span>{statusLabels[order.status]}</span>
						</div>
						<div className="flex items-center gap-2">
							<Truck size={18} />
							<span>{order.trackingNumber ?? "Not shipped yet"}</span>
						</div>
						<div className="flex items-center gap-2">
							<Calendar size={18} />
							<span>
								{order.estimatedDelivery ?? "Estimated delivery not available"}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
