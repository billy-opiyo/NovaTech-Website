"use client"

import { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
	}

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo)
	}

	public render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className="min-h-[50vh] flex items-center justify-center">
					<div className="glass-card p-8 text-center max-w-md">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
							<AlertTriangle className="text-red-500" size={32} />
						</div>
						<h2 className="text-xl font-bold mb-2">Something went wrong</h2>
						<p className="text-gray-500 mb-6">
							{this.state.error?.message ||
								"An unexpected error occurred. Please try again."}
						</p>
						<button
							onClick={() => {
								this.setState({ hasError: false })
								window.location.reload()
							}}
							className="btn-primary inline-flex items-center gap-2"
						>
							<RefreshCw size={18} /> Try Again
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
