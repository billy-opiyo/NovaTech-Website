"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { CheckCircle2, Info, X, XCircle } from "lucide-react"

export const TOAST_DURATION = 4000

type ToastTone = "success" | "error" | "info"

type Toast = {
	id: number
	message: string
	tone: ToastTone
}

type ToastContextValue = {
	addToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([])
	const pathname = usePathname()

	const dismissToast = useCallback((id: number) => {
		setToasts((current) => current.filter((toast) => toast.id !== id))
	}, [])

	const addToast = useCallback((message: string, tone: ToastTone = "info") => {
		const id = Date.now() + Math.random()
		setToasts((current) => [...current, { id, message, tone }].slice(-3))
	}, [])

	useEffect(() => {
		const url = new URL(window.location.href)
		if (url.searchParams.get("login") !== "success") return
		addToast("Login successful", "success")
		url.searchParams.delete("login")
		window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
	}, [addToast, pathname])

	return (
		<ToastContext.Provider value={{ addToast }}>
			{children}
			<div
				aria-live="polite"
				aria-atomic="true"
				className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] flex max-h-[calc(100dvh-1.5rem)] w-auto max-w-[calc(100vw-1.5rem)] flex-col items-stretch gap-3 overflow-y-auto sm:left-auto sm:right-4 sm:w-96 sm:max-w-[calc(100vw-2rem)]"
			>
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
				))}
			</div>
		</ToastContext.Provider>
	)
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
	useEffect(() => {
		const timeout = window.setTimeout(() => onDismiss(toast.id), TOAST_DURATION)
		return () => window.clearTimeout(timeout)
	}, [onDismiss, toast.id])

	const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? XCircle : Info
	const color = toast.tone === "success" ? "text-green-600" : toast.tone === "error" ? "text-red-600" : "text-primary"

	return (
		<div
			role={toast.tone === "error" ? "alert" : "status"}
			className="pointer-events-auto flex min-w-0 items-start gap-3 rounded-xl border border-white/20 bg-white/95 p-4 text-sm text-gray-900 shadow-xl backdrop-blur dark:bg-gray-900/95 dark:text-white"
		>
			<Icon size={20} className={`mt-0.5 shrink-0 ${color}`} aria-hidden="true" />
			<p className="min-w-0 flex-1 break-words">{toast.message}</p>
			<button
				type="button"
				aria-label="Dismiss notification"
				onClick={() => onDismiss(toast.id)}
				className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10"
			>
				<X size={16} />
			</button>
		</div>
	)
}

export function useToast() {
	const context = useContext(ToastContext)
	if (!context) throw new Error("useToast must be used inside ToastProvider")
	return context
}
