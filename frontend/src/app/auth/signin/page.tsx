"use client"

import { Suspense, useState } from "react"
import { motion } from "framer-motion"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, AlertCircle, Eye, EyeOff, LoaderCircle } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import AuthCloseButton from "@/components/auth/AuthCloseButton"
import { useStoreContext } from "@/lib/store-context"
import { getStoreHomeHref } from "@/lib/store-home"

function withLoginSuccess(url: string) {
	const target = new URL(url, "http://nurava-auth.local")
	target.searchParams.set("login", "success")
	return `${target.pathname}${target.search}${target.hash}`
}

function SignInForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const store = useStoreContext()
	const requestedCallbackUrl = searchParams.get("callbackUrl") || "/"
	const callbackUrl = requestedCallbackUrl.startsWith("/") && !requestedCallbackUrl.startsWith("//") && !requestedCallbackUrl.includes("\\")
		? requestedCallbackUrl
		: "/"
	const gate = searchParams.get("gate") === "1"
	const gatePortal = searchParams.get("portal")
	const gateReason = searchParams.get("reason")
	const gateMessage = gateReason === "unauthorized" && gatePortal === "admin"
		? "This account is not authorized for admin access."
		: gateReason === "unauthorized" && gatePortal === "manage"
			? "This account is not authorized to manage this store."
			: gateReason === "unauthorized" && gatePortal === "platform"
				? "This account is not authorized for platform access."
				: gatePortal === "admin"
					? "Sign in to continue to admin access."
					: gatePortal === "manage"
						? "Sign in to continue to store management."
						: gatePortal === "platform"
							? "Sign in to continue to platform access."
							: "Sign in to continue."
	const signupParams = new URLSearchParams({ callbackUrl })
	if (gate) signupParams.set("gate", "1")
	if (gatePortal === "admin" || gatePortal === "manage" || gatePortal === "platform") signupParams.set("portal", gatePortal)
	if (gateReason === "unauthorized") signupParams.set("reason", gateReason)
	const signupHref = `/auth/signup?${signupParams.toString()}`
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

			router.replace(withLoginSuccess(callbackUrl))
		} catch {
			setError("Something went wrong. Please try again.")
			setIsLoading(false)
		}
	}

	const handleGoogleSignIn = async () => {
		setIsLoading(true)
		await signIn("google", { callbackUrl: withLoginSuccess(callbackUrl) })
	}

	return (
		<div className={gate ? "fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" : "min-h-[70vh] flex items-center justify-center"} role={gate ? "dialog" : undefined} aria-modal={gate ? "true" : undefined} aria-label={gate ? "Authentication required" : undefined}>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-md"
			>
				<div className={`glass-card relative p-8 ${gate ? "max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl" : ""}`}>
					<AuthCloseButton fallback={getStoreHomeHref(store)} skipHistory label="Close sign-in dialog" />
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
						<p className="text-gray-500">Sign in to your account to continue</p>
					</div>

					{gate && <div className={`mb-6 rounded-lg border p-3 text-sm ${gateReason === "unauthorized" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-primary/30 bg-primary/10 text-primary"}`} role="status">{gateMessage}</div>}

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
						{isLoading ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <FcGoogle size={20} aria-hidden="true" />}
						<span className="font-medium">{isLoading ? "Signing in…" : "Continue with Google"}</span>
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
						Don&apos;t have an account?{" "}
						<Link
							href={signupHref}
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
