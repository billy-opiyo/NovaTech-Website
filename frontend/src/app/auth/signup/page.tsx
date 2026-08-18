"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, Check } from "lucide-react"
import { clientConfig } from "@/config/client.config"
import { FREE_SHIPPING_THRESHOLD } from "@/constants"
import AuthCloseButton from "@/components/auth/AuthCloseButton"

export default function SignUpPage() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState("")
	const [showPassword, setShowPassword] = useState(false)
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
		acceptedTerms: false,
	})

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault()
		setError("")

		if (formData.password !== formData.confirmPassword) {
			setError("Passwords do not match")
			return
		}

		if (formData.password.length < 8) {
			setError("Password must be at least 8 characters")
			return
		}

		setIsLoading(true)

		try {
			const res = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formData.name,
					email: formData.email,
					password: formData.password,
				}),
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || "Registration failed")
			}

			router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`)
		} catch (err: any) {
			setError(err.message || "Something went wrong")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-[70vh] flex items-center justify-center">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-md"
			>
				<div className="glass-card relative p-8">
					<AuthCloseButton />
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold mb-2">Create an Account</h1>
						<p className="text-gray-500">Join {clientConfig.brand.name} for exclusive deals</p>
					</div>

					{error && (
						<div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-600 text-sm">
							<AlertCircle size={16} />
							{error}
						</div>
					)}

					<form onSubmit={handleSignUp} className="space-y-4">
						<div>
							<label className="block text-sm font-medium mb-1">
								Full Name
							</label>
							<div className="relative">
								<User
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
									size={18}
								/>
								<input
									type="text"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
									placeholder="John Doe"
									required
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Email</label>
							<div className="relative">
								<Mail
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
									size={18}
								/>
								<input
									type="email"
									value={formData.email}
									onChange={(e) =>
										setFormData({ ...formData, email: e.target.value })
									}
									className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
									placeholder="you@example.com"
									required
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Password</label>
							<div className="relative">
								<Lock
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
									size={18}
								/>
								<input
									type={showPassword ? "text" : "password"}
									value={formData.password}
									onChange={(e) =>
										setFormData({ ...formData, password: e.target.value })
									}
									className="w-full pl-10 pr-12 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
									placeholder="Min. 8 characters"
									required
									minLength={8}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
								>
									{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
								</button>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">
								Confirm Password
							</label>
							<div className="relative">
								<Lock
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
									size={18}
								/>
								<input
									type="password"
									value={formData.confirmPassword}
									onChange={(e) =>
										setFormData({
											...formData,
											confirmPassword: e.target.value,
										})
									}
									className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
									placeholder="Repeat your password"
									required
								/>
							</div>
						</div>

						<div className="text-sm text-gray-500">
							<p className="flex items-center gap-2 mb-1">
								<Check size={14} className="text-green-500" /> Free shipping on
								orders over {clientConfig.site.currency} {FREE_SHIPPING_THRESHOLD.toLocaleString()}
							</p>
							<p className="flex items-center gap-2">
								<Check size={14} className="text-green-500" /> Exclusive deals
								and early access
							</p>
						</div>

						<label className="flex items-start gap-2 text-sm text-gray-500">
							<input
								type="checkbox"
								checked={formData.acceptedTerms}
								onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
								className="mt-1 accent-primary"
								required
							/>
							<span>
								I agree to the <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link>, <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>, and <Link href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>.
							</span>
						</label>

						<button
							type="submit"
							disabled={isLoading}
							className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
						>
							{isLoading ? (
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : null}
							Create Account
						</button>
					</form>

					<p className="text-center text-sm mt-6 text-gray-500">
						Already have an account?{" "}
						<Link
							href="/auth/signin"
							className="text-primary hover:underline font-medium"
						>
							Sign In
						</Link>
					</p>
				</div>
			</motion.div>
		</div>
	)
}
