"use client"

import { Check, MapPin, Truck, CreditCard } from "lucide-react"
import clsx from "clsx"

export type CheckoutStep = "shipping" | "delivery" | "payment" | "review"

const steps: { key: CheckoutStep; label: string; icon: React.ReactNode }[] = [
	{ key: "shipping", label: "Shipping", icon: <MapPin size={18} /> },
	{ key: "delivery", label: "Delivery", icon: <Truck size={18} /> },
	{ key: "payment", label: "Payment", icon: <CreditCard size={18} /> },
	{ key: "review", label: "Review", icon: <Check size={18} /> },
]

export default function CheckoutSteps({ currentStep }: { currentStep: CheckoutStep }) {
	const currentIndex = steps.findIndex((s) => s.key === currentStep)

	return (
		<div className="flex items-center justify-center mb-12">
			{steps.map((step, i) => (
				<div key={step.key} className="flex items-center">
					<div
						className={clsx(
							"flex items-center gap-2 px-4 py-2 rounded-full text-sm transition",
							currentIndex >= i
								? "bg-primary text-white"
								: "bg-gray-200 dark:bg-gray-700 text-gray-500",
						)}
					>
						{step.icon}
						<span className="hidden sm:inline">{step.label}</span>
					</div>
					{i < steps.length - 1 && (
						<div
							className={clsx(
								"w-8 h-0.5 mx-1",
								currentIndex > i ? "bg-primary" : "bg-gray-300 dark:bg-gray-600",
							)}
						/>
					)}
				</div>
			))}
		</div>
	)
}