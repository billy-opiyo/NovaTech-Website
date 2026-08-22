"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Phone,
	Mail,
	MapPin,
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
import { FaWhatsapp } from "react-icons/fa"
import clsx from "clsx"
import { useStoreContext } from "@/lib/store-context"

interface FAQ {
	question: string
	answer: string
	category: string
}

const shopperFaqs: FAQ[] = [
	{
		category: "Orders & Shipping",
		question: "How long does delivery take?",
		answer:
			"Delivery times and options are set by each independent store. Contact the merchant directly for the current delivery timeline and cost.",
	},
	{
		category: "Orders & Shipping",
		question: "How can I track my order?",
		answer:
			"The merchant provides order and delivery updates directly. Nurava Tech does not create or manage the merchant's customer order unless the store tells you otherwise.",
	},
	{
		category: "Orders & Shipping",
		question: "Do you deliver outside Nairobi?",
		answer:
			"Many merchants serve customers across Kenya, but delivery coverage and costs vary by store. Confirm the details with the merchant before purchasing.",
	},
	{
		category: "Returns & Warranty",
		question: "What is your return policy?",
		answer:
			"Returns and replacements are handled by the merchant that sold the product. Ask that store for its return window, conditions, and process before purchasing.",
	},
	{
		category: "Returns & Warranty",
		question: "Do products come with warranty?",
		answer:
			"Warranty coverage is set by the merchant and/or manufacturer. Review the product page and confirm the exact terms with the store.",
	},
	{
		category: "Returns & Warranty",
		question: "How do I claim warranty?",
		answer:
			"Contact the merchant that sold the product with your order details. The merchant handles the warranty claim and manufacturer coordination.",
	},
	{
		category: "Payments",
		question: "What payment methods do you accept?",
		answer:
			"Each merchant chooses its own payment options. Nurava Tech does not collect shopper payments; the store will provide payment instructions directly.",
	},
	{
		category: "Payments",
		question: "Is it safe to pay online?",
		answer:
			"Nurava Tech protects the platform with HTTPS and security controls. Payment questions and payment security for a purchase should be confirmed with the merchant because the transaction is handled directly by that store.",
	},
	{
		category: "Products",
		question: "Are your products genuine?",
		answer:
			"Product authenticity and warranty coverage are responsibilities of the individual merchant. Ask the store for sourcing and warranty details before purchasing.",
	},
]

const merchantFaqs: FAQ[] = [
	{
		category: "Platform & onboarding",
		question: "What does Nurava Tech provide to merchants?",
		answer: "Nurava Tech provides store discovery, storefront technology, hosting, merchant tools, and platform support. Each merchant remains responsible for its own products and customer relationships.",
	},
	{
		category: "Platform & onboarding",
		question: "How do I create a merchant store?",
	answer: "Use Create Store to create your merchant workspace, choose an available plan, and continue setup from the merchant dashboard.",
	},
	{
		category: "Plans & billing",
		question: "What do the platform fees cover?",
		answer: "Your selected plan can include a one-time setup fee, recurring subscription charges, usage limits, and optional add-ons. Review the plan details in the merchant workspace before confirming.",
	},
	{
		category: "Plans & billing",
		question: "Who handles shopper payments, refunds, and warranties?",
		answer: "The individual merchant handles product sales, shopper payments, delivery, refunds, replacements, warranties, and related customer support. Nurava Tech provides the platform connection and merchant technology.",
	},
	{
		category: "Platform support",
		question: "What can merchant support help with?",
		answer: "Nurava Tech support can help with platform access, store setup, hosting, domains, subscription billing, and technical issues. Product and shopper issues should be handled by the merchant that made the sale.",
	},
]

export default function ContactPage() {
	const store = useStoreContext()
	const isPlatformHome = store.isPlatformHome
	const faqs = isPlatformHome ? merchantFaqs : shopperFaqs
	const whatsappHref = `https://wa.me/${store.contact.whatsappNumber}?text=${encodeURIComponent(store.contact.whatsappMessage)}`
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
				<h1 className="text-4xl font-bold mb-4">{isPlatformHome ? "Merchant Support" : "How Can We Help?"}</h1>
				<p className="text-lg text-gray-500 max-w-2xl mx-auto">
					{isPlatformHome
						? "Contact Nurava Tech about store setup, platform access, subscriptions, domains, hosting, or technical support."
						: "Get in touch with the store's support team about products, orders, delivery, returns, warranties, or other shopper questions."}
				</p>
			</motion.div>

			<div className="grid md:grid-cols-3 gap-6 mb-16">
				{[
					{
						icon: Phone,
						title: "Call Us",
						description: store.contact.businessHours,
						details: store.contact.phoneDisplay,
						href: store.contact.phoneHref,
						color: "bg-blue-500",
					},
					{
						icon: Mail,
						title: "Email Us",
						description: store.contact.responseTime,
						details: store.contact.email,
						href: store.contact.emailHref,
						color: "bg-green-500",
					},
					{
						icon: FaWhatsapp,
						title: "WhatsApp",
						description: "Quick chat support",
						details: "Chat on WhatsApp",
						href: whatsappHref,
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
						<a
							href={card.href}
							target={card.title === "WhatsApp" ? "_blank" : undefined}
							rel={card.title === "WhatsApp" ? "noreferrer" : undefined}
							className="font-medium text-primary hover:underline"
						>
							{card.details}
						</a>
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
													{isPlatformHome ? "Store or account reference (if applicable)" : "Order Number (if applicable)"}
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
													placeholder={isPlatformHome ? "Store slug or account reference" : "EB-XXXXXXXX"}
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
						{isPlatformHome ? <>
							<option value="onboarding">Store onboarding</option>
							<option value="platform">Platform access or technical issue</option>
							<option value="billing">Subscription or billing</option>
							<option value="domain">Domain or hosting</option>
						</> : <>
							<option value="order">Order Inquiry</option>
							<option value="product">Product Question</option>
							<option value="warranty">Warranty Claim</option>
							<option value="return">Return Request</option>
							<option value="payment">Payment Issue</option>
						</>}
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
						<h3 className="font-semibold mb-2">{isPlatformHome ? "Platform Support" : "Visit Our Store"}</h3>
						<p className="text-sm text-gray-500">
							{isPlatformHome ? "Merchant support and platform operations" : "Kimathi Street, CBD"}
							<br />
							Nairobi, Kenya
						</p>
					</div>
					<div className="text-center">
						<Clock className="mx-auto mb-3 text-primary" size={32} />
						<h3 className="font-semibold mb-2">Business Hours</h3>
						<p className="text-sm text-gray-500">
							{isPlatformHome ? "Merchant support: Monday - Saturday" : "Monday - Saturday: 8AM - 6PM"}
							<br />
							{isPlatformHome ? "Response within 24 hours" : "Sunday: 10AM - 4PM"}
						</p>
					</div>
					<div className="text-center">
						<Shield className="mx-auto mb-3 text-primary" size={32} />
						<h3 className="font-semibold mb-2">Trust & Security</h3>
						<p className="text-sm text-gray-500">
							{isPlatformHome ? "Secure platform • Merchant-first support" : "SSL Encrypted • Genuine Products"}
							<br />
							{isPlatformHome ? "Store sales remain the merchant's responsibility" : "Merchant-set warranty • Direct payment with store"}
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	)
}
