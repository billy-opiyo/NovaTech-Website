"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	Shield,
	Search,
	Eye,
	Trash2,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Download,
	Lock,
	Key,
	UserCheck,
	Activity,
	Smartphone,
	Monitor,
	MapPin,
	Edit,
} from "lucide-react"
import clsx from "clsx"

interface LoginActivity {
	id: string
	userName: string
	userEmail: string
	userRole: string
	ipAddress: string
	location: string
	device: string
	browser: string
	loginTime: string
	logoutTime?: string
	status: "success" | "failed" | "suspicious"
}

interface AdminUser {
	id: string
	name: string
	email: string
	role: string
	lastLogin: string
	loginCount: number
	status: "active" | "inactive" | "locked"
	twoFactorEnabled: boolean
}

const mockLoginActivity: LoginActivity[] = [
	{
		id: "log-1",
		userName: "Admin User",
		userEmail: "admin@novatech.co.ke",
		userRole: "SUPERADMIN",
		ipAddress: "192.168.1.100",
		location: "Nairobi, Kenya",
		device: "Desktop",
		browser: "Chrome 127",
		loginTime: "2024-08-24 09:30:00",
		status: "success",
	},
	{
		id: "log-2",
		userName: "John Doe",
		userEmail: "john@novatech.co.ke",
		userRole: "ADMIN",
		ipAddress: "192.168.1.101",
		location: "Mombasa, Kenya",
		device: "Mobile",
		browser: "Safari 17",
		loginTime: "2024-08-24 08:15:00",
		logoutTime: "2024-08-24 12:45:00",
		status: "success",
	},
	{
		id: "log-3",
		userName: "Unknown",
		userEmail: "hacker@example.com",
		userRole: "N/A",
		ipAddress: "203.0.113.45",
		location: "Unknown",
		device: "Desktop",
		browser: "Firefox 126",
		loginTime: "2024-08-24 03:22:00",
		status: "failed",
	},
	{
		id: "log-4",
		userName: "Sarah Kimani",
		userEmail: "sarah@novatech.co.ke",
		userRole: "ADMIN",
		ipAddress: "192.168.1.102",
		location: "Kisumu, Kenya",
		device: "Desktop",
		browser: "Chrome 127",
		loginTime: "2024-08-23 14:20:00",
		logoutTime: "2024-08-23 18:30:00",
		status: "success",
	},
]

const mockAdminUsers: AdminUser[] = [
	{
		id: "user-1",
		name: "Admin User",
		email: "admin@novatech.co.ke",
		role: "SUPERADMIN",
		lastLogin: "2024-08-24 09:30:00",
		loginCount: 1245,
		status: "active",
		twoFactorEnabled: true,
	},
	{
		id: "user-2",
		name: "John Doe",
		email: "john@novatech.co.ke",
		role: "ADMIN",
		lastLogin: "2024-08-24 08:15:00",
		loginCount: 456,
		status: "active",
		twoFactorEnabled: true,
	},
	{
		id: "user-3",
		name: "Sarah Kimani",
		email: "sarah@novatech.co.ke",
		role: "ADMIN",
		lastLogin: "2024-08-23 14:20:00",
		loginCount: 234,
		status: "active",
		twoFactorEnabled: false,
	},
	{
		id: "user-4",
		name: "Mike Omondi",
		email: "mike@novatech.co.ke",
		role: "ADMIN",
		lastLogin: "2024-08-20 10:00:00",
		loginCount: 89,
		status: "locked",
		twoFactorEnabled: false,
	},
]

const statusFilters = ["All", "Success", "Failed", "Suspicious"]

export default function AdminSecurityPage() {
	const [activeTab, setActiveTab] = useState("activity")
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("All")

	const filteredActivity = mockLoginActivity.filter((log) => {
		const matchesSearch =
			log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.ipAddress.includes(searchQuery) ||
			log.location.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === "All" || log.status.toLowerCase() === statusFilter.toLowerCase()
		return matchesSearch && matchesStatus
	})

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			success: "bg-green-500/20 text-green-600",
			failed: "bg-red-500/20 text-red-600",
			suspicious: "bg-orange-500/20 text-orange-600",
		}
		return styles[status] || "bg-gray-500/20 text-gray-600"
	}

	const getStatusIcon = (status: string) => {
		const icons: Record<string, React.ReactNode> = {
			success: <CheckCircle2 size={14} />,
			failed: <XCircle size={14} />,
			suspicious: <AlertTriangle size={14} />,
		}
		return icons[status] || null
	}

	const securityStats = {
		totalLogins: mockLoginActivity.length,
		successful: mockLoginActivity.filter((l) => l.status === "success").length,
		failed: mockLoginActivity.filter((l) => l.status === "failed").length,
		suspicious: mockLoginActivity.filter((l) => l.status === "suspicious").length,
		activeAdmins: mockAdminUsers.filter((u) => u.status === "active").length,
		lockedAccounts: mockAdminUsers.filter((u) => u.status === "locked").length,
	}

	return (
		<div>
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Security</h1>
					<p className="text-gray-500 mt-1">Monitor login activity and manage admin access</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
						<Download size={18} /> Export Logs
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
				{[
					{
						label: "Total Logins",
						value: securityStats.totalLogins.toString(),
						icon: Activity,
						color: "text-blue-500",
					},
					{
						label: "Successful",
						value: securityStats.successful.toString(),
						icon: CheckCircle2,
						color: "text-green-500",
					},
					{
						label: "Failed",
						value: securityStats.failed.toString(),
						icon: XCircle,
						color: "text-red-500",
					},
					{
						label: "Suspicious",
						value: securityStats.suspicious.toString(),
						icon: AlertTriangle,
						color: "text-orange-500",
					},
					{
						label: "Active Admins",
						value: securityStats.activeAdmins.toString(),
						icon: UserCheck,
						color: "text-green-500",
					},
					{
						label: "Locked",
						value: securityStats.lockedAccounts.toString(),
						icon: Lock,
						color: "text-red-500",
					},
				].map((stat, index) => (
					<motion.div
						key={stat.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
						className="glass-card p-4"
					>
						<div className="flex items-center gap-3">
							<stat.icon className={stat.color} size={24} />
							<div>
								<p className="text-2xl font-bold">{stat.value}</p>
								<p className="text-xs text-gray-500">{stat.label}</p>
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{/* Tabs */}
			<div className="glass-card p-4 mb-6">
				<div className="flex gap-2">
					{[
						{ id: "activity", label: "Login Activity", icon: Activity },
						{ id: "users", label: "Admin Users", icon: UserCheck },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={clsx(
								"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
								activeTab === tab.id
									? "bg-primary text-white"
									: "bg-white/10 hover:bg-white/20",
							)}
						>
							<tab.icon size={16} />
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Login Activity Tab */}
			{activeTab === "activity" && (
				<div>
					{/* Filters */}
					<div className="glass-card p-4 mb-6">
						<div className="flex flex-col md:flex-row gap-4">
							<div className="relative flex-1">
								<Search
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
									size={18}
								/>
								<input
									type="text"
									placeholder="Search by user, email, IP, or location..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
								/>
							</div>
							<div className="flex gap-2 overflow-x-auto">
								{statusFilters.map((filter) => (
									<button
										key={filter}
										onClick={() => setStatusFilter(filter)}
										className={clsx(
											"px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
											statusFilter === filter
												? "bg-primary text-white"
												: "bg-white/10 hover:bg-white/20",
										)}
									>
										{filter}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Activity Table */}
					<div className="glass-card overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b border-gray-200 dark:border-gray-700">
										<th className="p-4 text-left text-sm font-medium text-gray-500">
											User
										</th>
										<th className="p-4 text-left text-sm font-medium text-gray-500">
											IP Address
										</th>
										<th className="p-4 text-left text-sm font-medium text-gray-500">
											Location
										</th>
										<th className="p-4 text-left text-sm font-medium text-gray-500">
											Device
										</th>
										<th className="p-4 text-left text-sm font-medium text-gray-500">
											Login Time
										</th>
										<th className="p-4 text-left text-sm font-medium text-gray-500">
											Status
										</th>
										<th className="p-4 text-left text-sm font-medium text-gray-500">
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredActivity.map((log, index) => (
										<motion.tr
											key={log.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: index * 0.03 }}
											className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition"
										>
											<td className="p-4">
												<div>
													<p className="font-medium text-sm">{log.userName}</p>
													<p className="text-xs text-gray-500">{log.userEmail}</p>
													<p className="text-xs text-gray-400">{log.userRole}</p>
												</div>
											</td>
											<td className="p-4">
												<span className="font-mono text-xs">{log.ipAddress}</span>
											</td>
											<td className="p-4">
												<div className="flex items-center gap-1">
													<MapPin size={14} className="text-gray-400" />
													<span className="text-sm">{log.location}</span>
												</div>
											</td>
											<td className="p-4">
												<div>
													<p className="text-sm">{log.device}</p>
													<p className="text-xs text-gray-500">{log.browser}</p>
												</div>
											</td>
											<td className="p-4">
												<div className="text-sm">
													<p>{log.loginTime}</p>
													{log.logoutTime && (
														<p className="text-xs text-gray-500">
															Logout: {log.logoutTime}
														</p>
													)}
												</div>
											</td>
											<td className="p-4">
												<span
													className={clsx(
														"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
														getStatusBadge(log.status),
													)}
												>
													{getStatusIcon(log.status)}
													{log.status.toUpperCase()}
												</span>
											</td>
											<td className="p-4">
												<button
													className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
													title="View Details"
												>
													<Eye size={16} />
												</button>
											</td>
										</motion.tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{/* Admin Users Tab */}
			{activeTab === "users" && (
				<div className="glass-card overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-gray-200 dark:border-gray-700">
									<th className="p-4 text-left text-sm font-medium text-gray-500">
										User
									</th>
									<th className="p-4 text-left text-sm font-medium text-gray-500">
										Role
									</th>
									<th className="p-4 text-left text-sm font-medium text-gray-500">
										Last Login
									</th>
									<th className="p-4 text-left text-sm font-medium text-gray-500">
										Login Count
									</th>
									<th className="p-4 text-left text-sm font-medium text-gray-500">
										2FA
									</th>
									<th className="p-4 text-left text-sm font-medium text-gray-500">
										Status
									</th>
									<th className="p-4 text-left text-sm font-medium text-gray-500">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{mockAdminUsers.map((user, index) => (
									<motion.tr
										key={user.id}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.03 }}
										className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition"
									>
										<td className="p-4">
											<div>
												<p className="font-medium text-sm">{user.name}</p>
												<p className="text-xs text-gray-500">{user.email}</p>
											</div>
										</td>
										<td className="p-4">
											<span className="text-sm">{user.role}</span>
										</td>
										<td className="p-4">
											<span className="text-sm text-gray-500">{user.lastLogin}</span>
										</td>
										<td className="p-4">
											<span className="text-sm font-medium">{user.loginCount}</span>
										</td>
										<td className="p-4">
											{user.twoFactorEnabled ? (
												<CheckCircle2 size={18} className="text-green-500" />
											) : (
												<XCircle size={18} className="text-red-500" />
											)}
										</td>
										<td className="p-4">
											<span
												className={clsx(
													"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
													user.status === "active"
														? "bg-green-500/20 text-green-600"
														: user.status === "locked"
															? "bg-red-500/20 text-red-600"
															: "bg-gray-500/20 text-gray-600",
												)}
											>
												{user.status.toUpperCase()}
											</span>
										</td>
										<td className="p-4">
											<div className="flex items-center gap-1">
												<button
													className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
													title="Edit"
												>
													<Edit size={16} />
												</button>
												<button
													className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
													title="Reset Password"
												>
													<Key size={16} />
												</button>
											</div>
										</td>
									</motion.tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}
