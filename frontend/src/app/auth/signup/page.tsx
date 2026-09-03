"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, Check, LoaderCircle } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import AuthCloseButton from "@/components/auth/AuthCloseButton"
import { useStoreContext } from "@/lib/store-context"
import { useToast } from "@/components/ui/Toast"
	import { getStoreHomeHref } from "@/lib/store-home"

function withLoginSuccess(url: string) {
	const target = new URL(url, "http://nurava-auth.local")
	target.searchParams.set("login", "success")
	return `${target.pathname}${target.search}${target.hash}`
}

export default function SignUpPage() {
	const router = useRouter()
	const store = useStoreContext()
	const { addToast } = useToast()
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState("")
	const [signInHref, setSignInHref] = useState("/auth/signin")
	const [showPassword, setShowPassword] = useState(false)
	const [isGate, setIsGate] = useState(false)

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		const callbackUrl = params.get("callbackUrl")
		setIsGate(params.get("gate") === "1")
		if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") && !callbackUrl.includes("\\")) {
			const signInParams = new URLSearchParams({ callbackUrl })
			if (params.get("gate") === "1") signInParams.set("gate", "1")
			if (params.get("portal")) signInParams.set("portal", params.get("portal") as string)
			if (params.get("reason")) signInParams.set("reason", params.get("reason") as string)
			setSignInHref(`/auth/signin?${signInParams.toString()}`)
		}
	}, [])
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
					callbackUrl: (() => {
						const value = new URLSearchParams(window.location.search).get("callbackUrl")
						return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined
					})(),
				}),
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.message || "Registration failed")
			}

			const params = new URLSearchParams(window.location.search)
			const callbackUrl = params.get("callbackUrl")
			const verifyUrl = new URLSearchParams({ email: formData.email.trim().toLowerCase() })
			if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") && !callbackUrl.includes("\\")) verifyUrl.set("callbackUrl", callbackUrl)
			if (params.get("gate") === "1") verifyUrl.set("gate", "1")
			if (params.get("portal")) verifyUrl.set("portal", params.get("portal") as string)
			if (params.get("reason")) verifyUrl.set("reason", params.get("reason") as string)
			addToast("Account created successfully. Check your email for the verification code.", "success")
			router.push(`/auth/verify-email?${verifyUrl.toString()}`)
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Something went wrong"
			setError(message)
			addToast(message, "error")
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoogleSignUp = async () => {
		if (!formData.acceptedTerms) {
			setError("Please agree to the Terms and Conditions and Privacy Policy first")
			return
		}

		setError("")
		setIsLoading(true)
		const requestedCallbackUrl = new URLSearchParams(window.location.search).get("callbackUrl") || "/"
		const callbackUrl = requestedCallbackUrl.startsWith("/") && !requestedCallbackUrl.startsWith("//") && !requestedCallbackUrl.includes("\\")
			? requestedCallbackUrl
			: "/"
		await signIn("google", { callbackUrl: withLoginSuccess(callbackUrl) })
	}

	return (
		<div className={isGate ? "fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" : "min-h-[70vh] flex items-center justify-center"} role={isGate ? "dialog" : undefined} aria-modal={isGate ? "true" : undefined} aria-label={isGate ? "Authentication required" : undefined}>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-md"
			>
				<div className={`glass-card relative p-8 ${isGate ? "max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl" : ""}`}>
					<AuthCloseButton fallback={getStoreHomeHref(store)} skipHistory />
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold mb-2">Create an Account</h1>
						<p className="text-gray-500">Join {store.brand.name} for exclusive deals</p>
					</div>

					{error && (
						<div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-600 text-sm">
							<AlertCircle size={16} />
							{error}
						</div>
					)}

					<button
						type="button"
						onClick={handleGoogleSignUp}
						disabled={isLoading}
						className="w-full mb-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
					>
						{isLoading ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <FcGoogle size={20} aria-hidden="true" />}
						<span className="font-medium">{isLoading ? "Creating account…" : "Continue with Google"}</span>
					</button>

					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-4 bg-white dark:bg-dark-surface text-gray-500">
								or create with email
							</span>
						</div>
					</div>

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
								orders over {store.site.currency} {store.ecommerce.freeShippingThreshold.toLocaleString()}
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
							href={signInHref}
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
