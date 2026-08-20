"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
	Store,
	Mail,
	CreditCard,
	Bell,
	Shield,
	Palette,
} from "lucide-react"
import clsx from "clsx"

export default function AdminSettingsPage() {
	const [activeTab, setActiveTab] = useState("general")

	const settingsTabs = [
		{ id: "general", label: "General", icon: Store },
		{ id: "email", label: "Email", icon: Mail },
		{ id: "payments", label: "Payments", icon: CreditCard },
		{ id: "notifications", label: "Notifications", icon: Bell },
		{ id: "security", label: "Security", icon: Shield },
		{ id: "appearance", label: "Appearance", icon: Palette },
	]

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
					<p className="text-gray-500 mt-1">Review deployment-managed store configuration</p>
				</div>
			</div>

			{/* Settings Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Sidebar */}
				<div className="lg:col-span-1">
					<div className="glass-card p-4">
						<nav className="space-y-2">
							{settingsTabs.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={clsx(
										"w-full flex items-center gap-3 px-4 py-3 rounded-lg transition",
										activeTab === tab.id
											? "bg-primary text-white"
											: "hover:bg-gray-100 dark:hover:bg-gray-800",
									)}
								>
									<tab.icon size={18} />
									<span className="text-sm font-medium">{tab.label}</span>
								</button>
							))}
						</nav>
					</div>
				</div>

				{/* Content */}
				<div className="lg:col-span-3">
					{activeTab === "general" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-6"
						>
							<div className="glass-card p-6">
								<h2 className="text-xl font-bold mb-6">General Settings</h2>
								<div className="space-y-6">
									<div>
										<label className="block text-sm font-medium mb-2">Store Name</label>
										<input
											type="text"
										defaultValue="Nurava Tech"
											className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
											readOnly
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">Store Email</label>
										<input
											type="email"
										defaultValue="support@nuravatech.com"
											className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
											readOnly
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">Store Phone</label>
										<input
											type="tel"
											defaultValue="+254 700 000 000"
											className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
											readOnly
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">Store Address</label>
										<textarea
											defaultValue="Nairobi, Kenya"
											rows={3}
											className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
											readOnly
										/>
									</div>
								</div>
							</div>

							<div className="glass-card p-6">
								<h2 className="text-xl font-bold mb-6">Business Information</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium mb-2">Currency</label>
										<select disabled className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary">
											<option>KES - Kenyan Shilling</option>
											<option>USD - US Dollar</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">Timezone</label>
										<select disabled className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary">
											<option>Africa/Nairobi (EAT)</option>
											<option>UTC</option>
										</select>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{activeTab === "email" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-6"
						>
							<div className="glass-card p-6">
									<h2 className="text-xl font-bold mb-2">Email Configuration</h2>
									<p className="mb-6 text-sm text-gray-500">Email credentials are supplied through the deployment environment.</p>
								<div className="space-y-6">
									<div>
										<label className="block text-sm font-medium mb-2">SMTP Host</label>
										<input
											type="text"
											placeholder="smtp.resend.com"
											className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
											disabled
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">SMTP Port</label>
										<input
											type="text"
											placeholder="587"
											className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
											disabled
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">API Key</label>
										<input
											type="password"
											placeholder="re_xxxxxxxxxxxx"
											className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
											disabled
										/>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{activeTab === "payments" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-6"
						>
							<div className="glass-card p-6">
										<h2 className="text-xl font-bold mb-6">Payment Methods</h2>
										<p className="mb-6 text-sm text-gray-500">Payment providers are configured by server environment variables.</p>
								<div className="space-y-6">
									<div className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
										<h3 className="font-semibold mb-2">M-Pesa Daraja</h3>
										<p className="text-sm text-gray-500 mb-4">Integrate M-Pesa STK Push payments</p>
										<span className="text-sm text-gray-500">Server configuration required</span>
									</div>
									<div className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
										<h3 className="font-semibold mb-2">Stripe</h3>
										<p className="text-sm text-gray-500 mb-4">Accept card payments via Stripe</p>
										<span className="text-sm text-gray-500">Server configuration required</span>
									</div>
									<div className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
										<h3 className="font-semibold mb-2">Cash on Delivery</h3>
										<p className="text-sm text-gray-500 mb-4">Enable cash on delivery option</p>
										<span className="text-sm text-gray-500">Server configuration required</span>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{activeTab === "notifications" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-6"
						>
							<div className="glass-card p-6">
								<h2 className="text-xl font-bold mb-6">Notification Settings</h2>
								<div className="space-y-4">
									{[
										{ name: "New Orders", description: "Send notification when new order is placed", enabled: true },
										{ name: "Order Status Updates", description: "Notify customers of order status changes", enabled: true },
										{ name: "Low Stock Alerts", description: "Alert when products are running low", enabled: true },
										{ name: "New Customer Registration", description: "Notify when new customer signs up", enabled: false },
										{ name: "Support Tickets", description: "Alert on new support ticket", enabled: true },
									].map((notification, index) => (
										<div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/20">
											<div>
												<p className="font-medium text-sm">{notification.name}</p>
												<p className="text-xs text-gray-500">{notification.description}</p>
											</div>
											<label className="relative inline-flex items-center cursor-pointer">
																<input type="checkbox" defaultChecked={notification.enabled} disabled className="sr-only peer" />
												<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
											</label>
										</div>
									))}
								</div>
							</div>
						</motion.div>
					)}

					{activeTab === "security" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-6"
						>
							<div className="glass-card p-6">
								<h2 className="text-xl font-bold mb-6">Security Settings</h2>
								<div className="space-y-6">
									<div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/20">
										<div>
											<p className="font-medium text-sm">Two-Factor Authentication</p>
											<p className="text-xs text-gray-500">Add extra security to admin accounts</p>
										</div>
										<span className="text-sm text-gray-500">Not available in the admin UI</span>
									</div>
									<div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/20">
										<div>
											<p className="font-medium text-sm">Login Notifications</p>
											<p className="text-xs text-gray-500">Get notified of new admin logins</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
																<input type="checkbox" defaultChecked disabled className="sr-only peer" />
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
										</label>
									</div>
									<div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/20">
										<div>
											<p className="font-medium text-sm">Session Timeout</p>
											<p className="text-xs text-gray-500">Auto-logout after inactivity</p>
										</div>
										<select disabled className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
											<option>30 minutes</option>
											<option>1 hour</option>
											<option>2 hours</option>
											<option>Never</option>
										</select>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{activeTab === "appearance" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-6"
						>
							<div className="glass-card p-6">
								<h2 className="text-xl font-bold mb-6">Appearance Settings</h2>
								<div className="space-y-6">
									<div>
										<label className="block text-sm font-medium mb-4">Theme</label>
										<div className="grid grid-cols-3 gap-4">
											{["Light", "Dark", "System"].map((theme) => (
														<div key={theme} className="p-4 rounded-xl border-2 border-primary">
													<p className="text-sm font-medium text-center">{theme}</p>
												</div>
											))}
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">Primary Color</label>
										<p className="mb-3 text-xs text-gray-500">Color presets are shown for reference only.</p>
										<div className="flex gap-3">
											{["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"].map((color) => (
												<div key={color} role="img" aria-label={`Color preset ${color}`} className="w-10 h-10 rounded-lg border-2 border-white shadow-md" style={{ backgroundColor: color }} />
											))}
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</div>
			</div>
		</div>
	)
}
