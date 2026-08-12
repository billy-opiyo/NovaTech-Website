"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCart } from "@/lib/cartContext"
import CheckoutSteps from "@/components/checkout/CheckoutSteps"
import OrderSummary from "@/components/checkout/OrderSummary"
import {
	ArrowLeft,
	Check,
	ChevronRight,
	ChevronLeft,
	Truck,
	Store,
	CreditCard,
	Smartphone,
	MapPin,
	AlertCircle,
	Shield,
	Package,
	Clock,
	Loader2,
} from "lucide-react"
import clsx from "clsx"
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

interface ShippingAddress {
	fullName: string
	phone: string
	email: string
	county: string
	town: string
	address: string
	landmark?: string
}

interface DeliveryOption {
	id: string
	name: string
	description: string
	price: number
	duration: string
	icon: React.ReactNode
}

const kenyaCounties = [
	"Nairobi",
	"Mombasa",
	"Kisumu",
	"Nakuru",
	"Eldoret",
	"Thika",
	"Nyeri",
	"Machakos",
	"Meru",
	"Nanyuki",
	"Kitale",
	"Malindi",
	"Kakamega",
	"Kisii",
	"Embu",
	"Garissa",
	"Other",
]

const deliveryOptions: DeliveryOption[] = [
	{
		id: "standard",
		name: "Standard Delivery",
		description: "Via partner courier",
		price: 500,
		duration: "2-5 business days",
		icon: <Truck size={24} />,
	},
	{
		id: "express",
		name: "Express Delivery",
		description: "Priority shipping",
		price: 1000,
		duration: "1-2 business days",
		icon: <Package size={24} />,
	},
	{
		id: "pickup",
		name: "Store Pickup",
		description: "Nairobi CBD",
		price: 0,
		duration: "Ready in 2 hours",
		icon: <Store size={24} />,
	},
]

const paymentMethods = [
	{
		id: "mpesa",
		name: "M-Pesa",
		icon: <Smartphone size={20} />,
		description: "Pay via Lipa na M-Pesa",
	},
	{
		id: "card",
		name: "Credit/Debit Card",
		icon: <CreditCard size={20} />,
		description: "Pay with Visa or Mastercard",
	},
	{
		id: "cod",
		name: "Cash on Delivery",
		icon: <CreditCard size={20} />,
		description: "Pay when you receive",
	},
]

type CheckoutStep = "shipping" | "delivery" | "payment" | "review"

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
	? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
	: null

function CheckoutPageContent() {
	const stripe = useStripe()
	const elements = useElements()
	const router = useRouter()
	const { items, subtotal, total, itemCount, clearCart } = useCart()
	const [currentStep, setCurrentStep] = useState<CheckoutStep>("shipping")
	const [isProcessing, setIsProcessing] = useState(false)
	const [orderComplete, setOrderComplete] = useState(false)
	const [orderNumber, setOrderNumber] = useState("")
	const [paymentError, setPaymentError] = useState("")
	const [paymentStatus, setPaymentStatus] = useState("")
	const [couponCode, setCouponCode] = useState("")
	const [couponDiscount, setCouponDiscount] = useState(0)

	const [shipping, setShipping] = useState<ShippingAddress>({
		fullName: "",
		phone: "",
		email: "",
		county: "",
		town: "",
		address: "",
		landmark: "",
	})
	const [selectedDelivery, setSelectedDelivery] = useState<string>("standard")
	const [selectedPayment, setSelectedPayment] = useState<string>("mpesa")
	const [mpesaPhone, setMpesaPhone] = useState("")
	const [saveInfo, setSaveInfo] = useState(false)
	const [errors, setErrors] = useState<
		Partial<Record<keyof ShippingAddress | "payment", string>>
	>({})

	const deliveryCost =
		deliveryOptions.find((d) => d.id === selectedDelivery)?.price || 0
	const orderTotal = Math.max(0, subtotal - couponDiscount + deliveryCost)

	useEffect(() => {
		const savedCoupon = localStorage.getItem("checkoutCoupon")
		if (!savedCoupon) return
		setCouponCode(savedCoupon)
		fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: savedCoupon, subtotal }) })
			.then((response) => response.ok ? response.json() : null)
			.then((result) => { if (result?.valid) setCouponDiscount(result.discount) })
	}, [subtotal])

	const validateShipping = () => {
		const newErrors: typeof errors = {}
		if (!shipping.fullName.trim()) newErrors.fullName = "Full name is required"
		if (!shipping.phone.match(/^07\d{8}$/))
			newErrors.phone = "Valid Kenyan phone number required (07XXXXXXXX)"
		if (!shipping.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
			newErrors.email = "Valid email is required"
		if (!shipping.county) newErrors.county = "County is required"
		if (!shipping.town.trim()) newErrors.town = "Town is required"
		if (!shipping.address.trim()) newErrors.address = "Address is required"
		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const validatePayment = () => {
		if (selectedPayment === "mpesa" && !mpesaPhone.match(/^07\d{8}$/)) {
			setErrors({ payment: "Valid M-Pesa phone number required" })
			return false
		}
		setErrors({})
		return true
	}

	const handleNext = () => {
		if (currentStep === "shipping" && validateShipping()) {
			setCurrentStep("delivery")
		} else if (currentStep === "delivery") {
			setCurrentStep("payment")
		} else if (currentStep === "payment" && validatePayment()) {
			setCurrentStep("review")
		}
	}

	const handleBack = () => {
		if (currentStep === "delivery") setCurrentStep("shipping")
		else if (currentStep === "payment") setCurrentStep("delivery")
		else if (currentStep === "review") setCurrentStep("payment")
	}

	const handlePlaceOrder = async () => {
		setIsProcessing(true)
		setPaymentError("")
		setPaymentStatus("Creating order...")

		try {
			// Step 1: Create order
			const orderResponse = await fetch("/api/orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: items.map((item) => ({
						productId: item.productId,
						quantity: item.quantity,
						variant: item.variant,
					})),
					shippingAddress: shipping,
					deliveryMethod: selectedDelivery,
					paymentMethod: selectedPayment,
					subtotal,
					shippingCost: deliveryCost,
					total: orderTotal,
					couponCode: couponCode || undefined,
					notes: saveInfo ? "Save shipping info for future orders" : undefined,
				}),
			})

			if (!orderResponse.ok) {
				const error = await orderResponse.json()
				throw new Error(error.message || "Failed to create order")
			}

			const order = await orderResponse.json()
			const orderId = order.id

			// Step 2: Process payment based on method
			if (selectedPayment === "cod") {
				// COD - order already created, just confirm
				setPaymentStatus("Order confirmed!")
				await new Promise((resolve) => setTimeout(resolve, 1000))
				setOrderNumber(orderId.slice(-8).toUpperCase())
				setOrderComplete(true)
				clearCart()
			} else if (selectedPayment === "mpesa") {
				// M-Pesa STK Push
				setPaymentStatus("Initiating M-Pesa payment...")
				const mpesaResponse = await fetch("/api/payments/mpesa/initiate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						amount: orderTotal,
						phone: mpesaPhone.startsWith("254") ? mpesaPhone : `254${mpesaPhone.substring(1)}`,
						reference: `ORD-${orderId.slice(-8)}`,
						orderId,
						metadata: { orderId },
					}),
				})

				if (!mpesaResponse.ok) {
					const error = await mpesaResponse.json()
					throw new Error(error.message || "Failed to initiate M-Pesa payment")
				}

				const mpesaResult = await mpesaResponse.json()
				if (!mpesaResult.ok) {
					throw new Error(mpesaResult.message || "M-Pesa payment failed")
				}

				// Poll for payment status
				setPaymentStatus("Waiting for payment confirmation...")
				let attempts = 0
				const maxAttempts = 30 // 30 seconds timeout

				while (attempts < maxAttempts) {
					await new Promise((resolve) => setTimeout(resolve, 1000))

					const verifyResponse = await fetch("/api/payments/mpesa/verify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							reference: `ORD-${orderId.slice(-8)}`,
						}),
					})

					if (verifyResponse.ok) {
						const verifyResult = await verifyResponse.json()
						if (verifyResult.status === "COMPLETED") {
							setPaymentStatus("Payment successful!")
							setOrderNumber(orderId.slice(-8).toUpperCase())
							setOrderComplete(true)
							clearCart()
							return
						} else if (verifyResult.status === "FAILED" || verifyResult.status === "CANCELLED") {
							throw new Error("M-Pesa payment was not completed")
						}
					}

					attempts++
				}

				throw new Error("Payment timeout. Please try again or contact support.")
			} else if (selectedPayment === "card") {
				// Card payment via Stripe
				setPaymentStatus("Creating payment intent...")
				const cardResponse = await fetch("/api/payments/card/create-intent", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						amount: orderTotal,
						customerEmail: shipping.email,
						reference: `ORD-${orderId.slice(-8)}`,
						orderId,
						metadata: { orderId },
					}),
				})

				if (!cardResponse.ok) {
					const error = await cardResponse.json()
					throw new Error(error.message || "Failed to create payment intent")
				}

				const cardResult = await cardResponse.json()
				if (!cardResult.ok) {
					throw new Error(cardResult.message || "Card payment setup failed")
				}

					if (!stripe || !elements) throw new Error("Card payments are not available yet")
					const cardElement = elements.getElement(CardElement)
					if (!cardElement) throw new Error("Enter your card details")
					setPaymentStatus("Confirming card payment...")
					const confirmation = await stripe.confirmCardPayment(cardResult.clientSecret, {
						payment_method: {
							card: cardElement,
							billing_details: { name: shipping.fullName, email: shipping.email, phone: shipping.phone },
						},
					})
					if (confirmation.error) throw new Error(confirmation.error.message || "Card payment failed")

				// Verify payment
				const verifyResponse = await fetch("/api/payments/card/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						reference: `ORD-${orderId.slice(-8)}`,
					}),
				})

				if (verifyResponse.ok) {
					const verifyResult = await verifyResponse.json()
						if (verifyResult.status === "COMPLETED") {
						setPaymentStatus("Payment successful!")
						setOrderNumber(orderId.slice(-8).toUpperCase())
						setOrderComplete(true)
						clearCart()
						return
					}
				}

				throw new Error("Card payment failed")
			}
		} catch (error: any) {
			console.error("Order placement error:", error)
			setPaymentError(error.message || "Failed to place order. Please try again.")
			setPaymentStatus("")
		} finally {
			setIsProcessing(false)
		}
	}

	if (items.length === 0 && !orderComplete) {
		return (
			<div className="text-center py-20">
				<h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
				<Link href="/products" className="btn-primary">
					Continue Shopping
				</Link>
			</div>
		)
	}

	if (orderComplete) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				className="max-w-2xl mx-auto text-center py-16"
			>
				<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
					<Check size={48} className="text-green-500" />
				</div>
				<h1 className="text-3xl font-bold mb-4">Order Confirmed!</h1>
				<p className="text-gray-500 mb-2">Thank you for your purchase.</p>
				<p className="text-lg font-semibold mb-6">Order #{orderNumber}</p>
				<p className="text-sm text-gray-500 mb-8">
					A confirmation email has been sent to {shipping.email}. You will
					receive updates via {selectedPayment === "mpesa" ? "SMS" : "WhatsApp"} on {shipping.phone}.
				</p>
				<div className="flex gap-4 justify-center">
					<Link href="/account/orders" className="btn-primary">
						Track Order
					</Link>
					<Link
						href="/products"
						className="border border-primary text-primary px-6 py-2 rounded-lg hover:bg-primary hover:text-white transition"
					>
						Continue Shopping
					</Link>
				</div>
			</motion.div>
		)
	}

	return (
		<div>
			<Link
				href="/cart"
				className="flex items-center gap-1 text-gray-500 hover:text-primary transition mb-8"
			>
				<ArrowLeft size={18} /> Back to Cart
			</Link>

			<CheckoutSteps currentStep={currentStep} />

			<div className="grid lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2">
					<AnimatePresence mode="wait">
						{currentStep === "shipping" && (
							<motion.div
								key="shipping"
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								className="glass-card p-6 md:p-8"
							>
								<h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
									<MapPin size={24} className="text-primary" /> Shipping
									Information
								</h2>

								<div className="grid md:grid-cols-2 gap-4">
									<div className="md:col-span-2">
										<label className="block text-sm font-medium mb-1">
											Full Name *
										</label>
										<input
											type="text"
											value={shipping.fullName}
											onChange={(e) =>
												setShipping({ ...shipping, fullName: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="John Doe"
										/>
										{errors.fullName && (
											<p className="text-red-500 text-xs mt-1">
												{errors.fullName}
											</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium mb-1">
											Phone Number *
										</label>
										<input
											type="tel"
											value={shipping.phone}
											onChange={(e) =>
												setShipping({ ...shipping, phone: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="0712345678"
										/>
										{errors.phone && (
											<p className="text-red-500 text-xs mt-1">
												{errors.phone}
											</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium mb-1">
											Email Address *
										</label>
										<input
											type="email"
											value={shipping.email}
											onChange={(e) =>
												setShipping({ ...shipping, email: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="john@example.com"
										/>
										{errors.email && (
											<p className="text-red-500 text-xs mt-1">
												{errors.email}
											</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium mb-1">
											County *
										</label>
										<select
											value={shipping.county}
											onChange={(e) =>
												setShipping({ ...shipping, county: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
										>
											<option value="">Select County</option>
											{kenyaCounties.map((county) => (
												<option key={county} value={county}>
													{county}
												</option>
											))}
										</select>
										{errors.county && (
											<p className="text-red-500 text-xs mt-1">
												{errors.county}
											</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium mb-1">
											Town/City *
										</label>
										<input
											type="text"
											value={shipping.town}
											onChange={(e) =>
												setShipping({ ...shipping, town: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="e.g., Westlands"
										/>
										{errors.town && (
											<p className="text-red-500 text-xs mt-1">{errors.town}</p>
										)}
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium mb-1">
											Delivery Address *
										</label>
										<input
											type="text"
											value={shipping.address}
											onChange={(e) =>
												setShipping({ ...shipping, address: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="House/Apartment number, Street name"
										/>
										{errors.address && (
											<p className="text-red-500 text-xs mt-1">
												{errors.address}
											</p>
										)}
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium mb-1">
											Landmark (Optional)
										</label>
										<input
											type="text"
											value={shipping.landmark}
											onChange={(e) =>
												setShipping({ ...shipping, landmark: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="e.g., Near Kenyatta Hospital"
										/>
									</div>

									<div className="md:col-span-2">
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={saveInfo}
												onChange={(e) => setSaveInfo(e.target.checked)}
												className="accent-primary rounded"
											/>
											<span className="text-sm">
												Save this information for next time
											</span>
										</label>
									</div>
								</div>

								<div className="flex justify-end mt-8">
									<button
										onClick={handleNext}
										className="btn-primary flex items-center gap-2"
									>
										Continue to Delivery <ChevronRight size={18} />
									</button>
								</div>
							</motion.div>
						)}

						{currentStep === "delivery" && (
							<motion.div
								key="delivery"
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								className="glass-card p-6 md:p-8"
							>
								<h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
									<Truck size={24} className="text-primary" /> Delivery Method
								</h2>

								<div className="space-y-4">
									{deliveryOptions.map((option) => (
										<label
											key={option.id}
											className={clsx(
												"flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition",
												selectedDelivery === option.id
													? "border-primary bg-primary/5"
													: "border-gray-200 dark:border-gray-700 hover:border-primary/50",
											)}
										>
											<input
												type="radio"
												name="delivery"
												value={option.id}
												checked={selectedDelivery === option.id}
												onChange={(e) => setSelectedDelivery(e.target.value)}
												className="mt-1 accent-primary"
											/>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="text-primary">{option.icon}</span>
													<span className="font-semibold">{option.name}</span>
												</div>
												<p className="text-sm text-gray-500 mt-1">
													{option.description}
												</p>
												<p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
													<Clock size={14} /> {option.duration}
												</p>
											</div>
											<span className="font-semibold">
												{option.price === 0
													? "FREE"
													: `KES ${option.price.toLocaleString()}`}
											</span>
										</label>
									))}
								</div>

								<div className="flex justify-between mt-8">
									<button
										onClick={handleBack}
										className="flex items-center gap-1 text-gray-500 hover:text-primary transition"
									>
										<ChevronLeft size={18} /> Back
									</button>
									<button
										onClick={handleNext}
										className="btn-primary flex items-center gap-2"
									>
										Continue to Payment <ChevronRight size={18} />
									</button>
								</div>
							</motion.div>
						)}

						{currentStep === "payment" && (
							<motion.div
								key="payment"
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								className="glass-card p-6 md:p-8"
							>
								<h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
									<CreditCard size={24} className="text-primary" /> Payment
									Method
								</h2>

								<div className="space-y-4">
									{paymentMethods.map((method) => (
										<label
											key={method.id}
											className={clsx(
												"flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition",
												selectedPayment === method.id
													? "border-primary bg-primary/5"
													: "border-gray-200 dark:border-gray-700 hover:border-primary/50",
											)}
										>
											<input
												type="radio"
												name="payment"
												value={method.id}
												checked={selectedPayment === method.id}
												onChange={(e) => setSelectedPayment(e.target.value)}
												className="mt-1 accent-primary"
											/>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="text-primary">{method.icon}</span>
													<span className="font-semibold">{method.name}</span>
												</div>
												<p className="text-sm text-gray-500 mt-1">
													{method.description}
												</p>
											</div>
										</label>
									))}
								</div>

								{selectedPayment === "mpesa" && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										className="mt-6"
									>
										<label className="block text-sm font-medium mb-2">
											M-Pesa Phone Number *
										</label>
										<input
											type="tel"
											value={mpesaPhone}
											onChange={(e) => setMpesaPhone(e.target.value)}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="0712345678"
										/>
										<p className="text-xs text-gray-500 mt-2">
											You will receive an M-Pesa prompt on this number to
											complete payment.
										</p>
										{errors.payment && (
											<p className="text-red-500 text-xs mt-1">
																{errors.payment}
																</p>
															)}
															</motion.div>
														)}

								{selectedPayment === "card" && (
									<div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black/10">
										<CardElement options={{ style: { base: { fontSize: "16px" } } }} />
									</div>
								)}

								<div className="flex justify-between mt-8">
									<button
										onClick={handleBack}
										className="flex items-center gap-1 text-gray-500 hover:text-primary transition"
									>
										<ChevronLeft size={18} /> Back
									</button>
									<button
										onClick={handleNext}
										className="btn-primary flex items-center gap-2"
									>
										Review Order <ChevronRight size={18} />
									</button>
								</div>
							</motion.div>
						)}

						{currentStep === "review" && (
							<motion.div
								key="review"
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								className="glass-card p-6 md:p-8"
							>
								<h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
									<Check size={24} className="text-primary" /> Review Your Order
								</h2>

								<div className="mb-6">
									<h3 className="font-medium mb-2 flex items-center gap-2">
										<MapPin size={16} /> Shipping Address
									</h3>
									<div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 text-sm">
										<p className="font-medium">{shipping.fullName}</p>
										<p>{shipping.phone}</p>
										<p>
											{shipping.address}, {shipping.town}
										</p>
										<p>{shipping.county}</p>
									</div>
								</div>

								<div className="mb-6">
									<h3 className="font-medium mb-2">
										Order Items ({itemCount})
									</h3>
									<div className="space-y-3">
										{items.map((item) => (
											<div
												key={item.id}
												className="flex gap-3 bg-black/5 dark:bg-white/5 rounded-lg p-3"
											>
												<div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
													<Image
														src={item.image}
														alt={item.name}
														fill
														className="object-cover"
													/>
												</div>
												<div className="flex-1 min-w-0">
													<p className="font-medium truncate">{item.name}</p>
													<p className="text-sm text-gray-500">
														Qty: {item.quantity}
													</p>
												</div>
												<p className="font-medium">
													KES {(item.price * item.quantity).toLocaleString()}
												</p>
											</div>
										))}
									</div>
								</div>

								<div className="grid md:grid-cols-2 gap-4 mb-6">
									<div className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
										<p className="text-sm text-gray-500">Delivery Method</p>
										<p className="font-medium">
											{
												deliveryOptions.find((d) => d.id === selectedDelivery)
													?.name
											}
										</p>
									</div>
									<div className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
										<p className="text-sm text-gray-500">Payment Method</p>
										<p className="font-medium">
											{
												paymentMethods.find((p) => p.id === selectedPayment)
													?.name
											}
										</p>
									</div>
								</div>

								<div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
									<div className="flex justify-between text-sm">
										<span>Subtotal</span>
										<span>KES {subtotal.toLocaleString()}</span>
									</div>
									<div className="flex justify-between text-sm">
										<span>Delivery</span>
										<span>
											{deliveryCost === 0
												? "FREE"
												: `KES ${deliveryCost.toLocaleString()}`}
										</span>
									</div>
									<div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
										<span>Total</span>
										<span>KES {orderTotal.toLocaleString()}</span>
									</div>
								</div>

								<div className="flex justify-between mt-8">
									<button
										onClick={handleBack}
										className="flex items-center gap-1 text-gray-500 hover:text-primary transition"
									>
										<ChevronLeft size={18} /> Back
									</button>
								<button
									onClick={handlePlaceOrder}
									disabled={isProcessing}
									className="btn-primary flex items-center gap-2 disabled:opacity-50"
								>
									{isProcessing ? (
										<>
											<Loader2 size={18} className="animate-spin" />
											{paymentStatus || "Processing..."}
										</>
									) : (
										<>
											<Shield size={18} /> Place Order - KES{" "}
											{orderTotal.toLocaleString()}
										</>
									)}
								</button>
								{paymentError && (
									<div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
										<div className="flex items-start gap-2">
											<AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
											<div>
												<p className="text-sm text-red-600 dark:text-red-400 font-medium">
													Payment Failed
												</p>
												<p className="text-sm text-red-600 dark:text-red-400 mt-1">
													{paymentError}
												</p>
											</div>
										</div>
									</div>
								)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<div className="hidden lg:block">
					<OrderSummary
						items={items}
						subtotal={subtotal}
						deliveryCost={deliveryCost}
						total={orderTotal}
					/>
				</div>
			</div>
		</div>
	)
}

export default function CheckoutPage() {
	return <Elements stripe={stripePromise}><CheckoutPageContent /></Elements>
}
