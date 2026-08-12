"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Phone,
	Mail,
	MapPin,
	MessageSquare,
	Clock,
	Send,
	ChevronDown,
	ChevronUp,
	CheckCircle,
	HelpCircle,
	Shield,
	Truck,
	RotateCcw,
	CreditCard,
} from "lucide-react"
import clsx from "clsx"

interface FAQ {
	question: string
	answer: string
	category: string
}

const faqs: FAQ[] = [
	{
		category: "Orders & Shipping",
		question: "How long does delivery take?",
		answer:
			"Nairobi deliveries typically take 1-2 business days. Outside Nairobi takes 2-5 business days depending on location. Express delivery options are available at checkout.",
	},
	{
		category: "Orders & Shipping",
		question: "How can I track my order?",
		answer:
			'Once your order is shipped, you will receive a tracking number via email and WhatsApp. You can also track your order in your account dashboard under "My Orders".',
	},
	{
		category: "Orders & Shipping",
		question: "Do you deliver outside Nairobi?",
		answer:
			"Yes! We deliver to all major towns across Kenya including Mombasa, Kisumu, Nakuru, Eldoret, and more. Delivery costs vary by location.",
	},
	{
		category: "Returns & Warranty",
		question: "What is your return policy?",
		answer:
			"We offer a 7-day replacement guarantee for defective products. Items must be returned in original packaging with all accessories. Contact our support team to initiate a return.",
	},
	{
		category: "Returns & Warranty",
		question: "Do products come with warranty?",
		answer:
			"Yes! All our products come with official manufacturer warranty. Most electronics have a 12-month warranty. Specific warranty details are listed on each product page.",
	},
	{
		category: "Returns & Warranty",
		question: "How do I claim warranty?",
		answer:
			"Contact our support team with your order number and product details. We will guide you through the warranty claim process and coordinate with the manufacturer.",
	},
	{
		category: "Payments",
		question: "What payment methods do you accept?",
		answer:
			"We accept M-Pesa (Lipa na M-Pesa) and Cash on Delivery. For M-Pesa payments, you will receive a prompt on your phone to complete the payment.",
	},
	{
		category: "Payments",
		question: "Is it safe to pay online?",
		answer:
			"Absolutely! Our website uses SSL encryption to protect your data. M-Pesa transactions are processed through Safaricom's secure Daraja API.",
	},
	{
		category: "Products",
		question: "Are your products genuine?",
		answer:
			"Yes! All our products are 100% genuine and sourced from authorized distributors. We provide official manufacturer warranty on all products.",
	},
]

export default function ContactPage() {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		phone: "",
		subject: "",
		message: "",
		orderNumber: "",
	})
	const [formStatus, setFormStatus] = useState<
		"idle" | "sending" | "sent" | "error"
	>("idle")
	const [openFaqs, setOpenFaqs] = useState<number[]>([])
	const [activeCategory, setActiveCategory] = useState<string>("All")

	const categories = ["All", ...new Set(faqs.map((faq) => faq.category))]

	const filteredFaqs =
		activeCategory === "All"
			? faqs
			: faqs.filter((faq) => faq.category === activeCategory)

	const toggleFaq = (index: number) => {
		setOpenFaqs((prev) =>
			prev.includes(index)
				? prev.filter((item) => item !== index)
				: [...prev, index],
		)
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		setFormStatus("sending")
		await new Promise((resolve) => setTimeout(resolve, 1500))
		setFormStatus("sent")

		setTimeout(() => {
			setFormStatus("idle")
			setFormData({
				name: "",
				email: "",
				phone: "",
				subject: "",
				message: "",
				orderNumber: "",
			})
		}, 3000)
	}

	return (
		<div>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="text-center mb-16"
			>
				<h1 className="text-4xl font-bold mb-4">How Can We Help?</h1>
				<p className="text-lg text-gray-500 max-w-2xl mx-auto">
					Get in touch with our support team. We are here to help with any
					questions about your orders, products, or warranty.
				</p>
			</motion.div>

			<div className="grid md:grid-cols-3 gap-6 mb-16">
				{[
					{
						icon: Phone,
						title: "Call Us",
						description: "Mon - Sat, 8AM - 6PM",
						details: "+254 700 123 456",
						color: "bg-blue-500",
					},
					{
						icon: Mail,
						title: "Email Us",
						description: "We reply within 24 hours",
details: "support@novatechstore.co.ke",
						color: "bg-green-500",
					},
					{
						icon: MessageSquare,
						title: "WhatsApp",
						description: "Quick chat support",
						details: "Chat on WhatsApp",
						color: "bg-green-600",
					},
				].map((card, index) => (
					<motion.div
						key={card.title}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: index * 0.1 }}
						className="glass-card p-6 text-center"
					>
						<div
							className={clsx(
								"w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center",
								card.color,
								"bg-opacity-20",
							)}
						>
							<card.icon
								className={card.color.replace("bg-", "text-")}
								size={24}
							/>
						</div>
						<h3 className="font-semibold text-lg mb-1">{card.title}</h3>
						<p className="text-sm text-gray-500 mb-3">{card.description}</p>
						<p className="font-medium text-primary">{card.details}</p>
					</motion.div>
				))}
			</div>

			<div className="grid lg:grid-cols-2 gap-12">
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					whileInView={{ opacity: 1, x: 0 }}
					viewport={{ once: true }}
				>
					<h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>

					<AnimatePresence mode="wait">
						{formStatus === "sent" ? (
							<motion.div
								key="success"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0 }}
								className="glass-card p-8 text-center"
							>
								<CheckCircle
									className="mx-auto mb-4 text-green-500"
									size={48}
								/>
								<h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
								<p className="text-gray-500">
									We will get back to you within 24 hours.
								</p>
							</motion.div>
						) : (
							<motion.form
								key="form"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onSubmit={handleSubmit}
								className="glass-card p-6 md:p-8 space-y-4"
							>
								<div className="grid md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											Name *
										</label>
										<input
											type="text"
											value={formData.name}
											onChange={(e) =>
												setFormData({ ...formData, name: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											required
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Email *
										</label>
										<input
											type="email"
											value={formData.email}
											onChange={(e) =>
												setFormData({ ...formData, email: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											required
										/>
									</div>
								</div>

								<div className="grid md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											Phone Number
										</label>
										<input
											type="tel"
											value={formData.phone}
											onChange={(e) =>
												setFormData({ ...formData, phone: e.target.value })
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="0712345678"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Order Number (if applicable)
										</label>
										<input
											type="text"
											value={formData.orderNumber}
											onChange={(e) =>
												setFormData({
													...formData,
													orderNumber: e.target.value,
												})
											}
											className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="EB-XXXXXXXX"
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium mb-1">
										Subject *
									</label>
									<select
										value={formData.subject}
										onChange={(e) =>
											setFormData({ ...formData, subject: e.target.value })
										}
										className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
										required
									>
										<option value="">Select a topic</option>
										<option value="order">Order Inquiry</option>
										<option value="product">Product Question</option>
										<option value="warranty">Warranty Claim</option>
										<option value="return">Return Request</option>
										<option value="payment">Payment Issue</option>
										<option value="other">Other</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium mb-1">
										Message *
									</label>
									<textarea
										value={formData.message}
										onChange={(e) =>
											setFormData({ ...formData, message: e.target.value })
										}
										rows={5}
										className="w-full px-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
										placeholder="Describe your issue or question..."
										required
									/>
								</div>

								<button
									type="submit"
									disabled={formStatus === "sending"}
									className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
								>
									{formStatus === "sending" ? (
										<>
											<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
											Sending...
										</>
									) : (
										<>
											<Send size={18} /> Send Message
										</>
									)}
								</button>
							</motion.form>
						)}
					</AnimatePresence>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, x: 20 }}
					whileInView={{ opacity: 1, x: 0 }}
					viewport={{ once: true }}
				>
					<h2 className="text-2xl font-bold mb-6">
						Frequently Asked Questions
					</h2>

					<div className="flex gap-2 flex-wrap mb-6">
						{categories.map((category) => (
							<button
								key={category}
								onClick={() => setActiveCategory(category)}
								className={clsx(
									"px-3 py-1.5 text-sm rounded-full transition",
									activeCategory === category
										? "bg-primary text-white"
										: "bg-black/5 dark:bg-white/5 hover:bg-primary/10 hover:text-primary",
								)}
							>
								{category}
							</button>
						))}
					</div>

					<div className="space-y-3">
						{filteredFaqs.map((faq, index) => {
							const globalIndex = faqs.indexOf(faq)
							const isOpen = openFaqs.includes(globalIndex)
							return (
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 10 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ delay: index * 0.05 }}
									className="glass-card overflow-hidden"
								>
									<button
										onClick={() => toggleFaq(globalIndex)}
										className="w-full flex items-center justify-between p-4 text-left"
									>
										<span className="font-medium pr-4">{faq.question}</span>
										{isOpen ? (
											<ChevronUp
												size={18}
												className="text-gray-400 flex-shrink-0"
											/>
										) : (
											<ChevronDown
												size={18}
												className="text-gray-400 flex-shrink-0"
											/>
										)}
									</button>
									<AnimatePresence>
										{isOpen && (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: "auto", opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												className="overflow-hidden"
											>
												<div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
													{faq.answer}
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</motion.div>
							)
						})}
					</div>
				</motion.div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				className="glass-card p-8 mt-16"
			>
				<div className="grid md:grid-cols-3 gap-8">
					<div className="text-center">
						<MapPin className="mx-auto mb-3 text-primary" size={32} />
						<h3 className="font-semibold mb-2">Visit Our Store</h3>
						<p className="text-sm text-gray-500">
							Kimathi Street, CBD
							<br />
							Nairobi, Kenya
						</p>
					</div>
					<div className="text-center">
						<Clock className="mx-auto mb-3 text-primary" size={32} />
						<h3 className="font-semibold mb-2">Business Hours</h3>
						<p className="text-sm text-gray-500">
							Monday - Saturday: 8AM - 6PM
							<br />
							Sunday: 10AM - 4PM
						</p>
					</div>
					<div className="text-center">
						<Shield className="mx-auto mb-3 text-primary" size={32} />
						<h3 className="font-semibold mb-2">Trust & Security</h3>
						<p className="text-sm text-gray-500">
							SSL Encrypted • Genuine Products
							<br />
							Official Warranty • Secure Payments
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	)
}
