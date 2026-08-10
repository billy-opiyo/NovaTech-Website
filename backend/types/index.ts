export type UserRole = "CUSTOMER" | "ADMIN" | "SUPERADMIN"

export interface ApiResponse<T = unknown> {
	success: boolean
	data?: T
	message?: string
	error?: string
}

export interface NotificationPayload {
	to: string
	message: string
	channel: "email" | "sms" | "whatsapp"
	metadata?: Record<string, unknown>
}

export interface PaymentIntentRequest {
	amount: number
	currency?: string
	customerEmail: string
	reference: string
	metadata?: Record<string, unknown>
}

export interface PaymentStatusResponse {
	ok: boolean
	provider: string
	reference: string
	status: "pending" | "completed" | "failed" | "unknown"
	message?: string
}
