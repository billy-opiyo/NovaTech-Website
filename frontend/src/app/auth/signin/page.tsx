"use client"

import { Suspense, useState } from "react"
import { motion } from "framer-motion"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, AlertCircle, Eye, EyeOff, X } from "lucide-react"
import { FcGoogle } from "react-icons/fc"

function SignInForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const requestedCallbackUrl = searchParams.get("callbackUrl") || "/"
	const callbackUrl = requestedCallbackUrl.startsWith("/") && !requestedCallbackUrl.startsWith("//")
		? requestedCallbackUrl
		: "/"
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState("")
	const [showPassword, setShowPassword] = useState(false)
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	})

	const handleCredentialsSignIn = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError("")

		try {
			const result = await signIn("credentials", {
				email: formData.email,
				password: formData.password,
				redirect: false,
			})

			if (result?.error) {
				setError("Invalid email or password")
				setIsLoading(false)
				return
			}

			router.push(callbackUrl)
			router.refresh()
		} catch (err) {
			setError("Something went wrong. Please try again.")
			setIsLoading(false)
		}
	}

	const handleGoogleSignIn = async () => {
		setIsLoading(true)
		await signIn("google", { callbackUrl })
	}

	const closeSignIn = () => {
		if (document.referrer.startsWith(window.location.origin)) {
			router.back()
			return
		}
		router.push(callbackUrl)
	}

	return (
		<div className="min-h-[70vh] flex items-center justify-center">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-md"
			>
				<div className="glass-card relative p-8">
					<button
						type="button"
						onClick={closeSignIn}
						aria-label="Close sign in"
						title="Close"
						className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-black/10 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
					>
						<X size={20} aria-hidden="true" />
					</button>
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
						<p className="text-gray-500">Sign in to your account to continue</p>
					</div>

					{error && (
						<div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-600 text-sm">
							<AlertCircle size={16} />
							{error}
						</div>
					)}

					<button
						onClick={handleGoogleSignIn}
						disabled={isLoading}
						className="w-full mb-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
					>
						<FcGoogle size={20} aria-hidden="true" />
						<span className="font-medium">Continue with Google</span>
					</button>

					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-4 bg-white dark:bg-dark-surface text-gray-500">
								or continue with email
							</span>
						</div>
					</div>

					<form onSubmit={handleCredentialsSignIn} className="space-y-4">
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
									placeholder="••••••••"
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
								>
									{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
								</button>
							</div>
						</div>

						<div className="flex items-center justify-between text-sm">
							<label className="flex items-center gap-2">
								<input type="checkbox" className="accent-primary rounded" />
								Remember me
							</label>
							<Link
								href="/auth/forgot-password"
								className="text-primary hover:underline"
							>
								Forgot password?
							</Link>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
						>
							{isLoading ? (
								<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : null}
							Sign In
						</button>
					</form>

					<p className="text-center text-sm mt-6 text-gray-500">
						Don't have an account?{" "}
						<Link
							href="/auth/signup"
							className="text-primary hover:underline font-medium"
						>
							Sign Up
						</Link>
					</p>
				</div>
			</motion.div>
		</div>
	)
}

export default function SignInPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-[70vh] flex items-center justify-center">
					Loading…
				</div>
			}
		>
			<SignInForm />
		</Suspense>
	)
}
