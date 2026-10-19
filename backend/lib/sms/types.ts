export type SmsProviderName = "africastalking" | "twilio"

export interface SmsPayload {
	to: string
	message: string
	senderId?: string
}

export interface SmsProviderPayload {
	to: string
	message: string
	senderId?: string
}

export interface SmsProviderReceipt {
	messageId?: string
	status?: string
	senderId?: string
}

export interface SmsProvider {
	send(payload: SmsProviderPayload): Promise<SmsProviderReceipt>
}

export function smsProviderTimeout(environment: Record<string, string | undefined>, fallback = 15000): number {
	const configured = Number(environment.SMS_PROVIDER_TIMEOUT_MS)
	return Number.isInteger(configured) && configured >= 1000 && configured <= 120000 ? configured : fallback
}

export class SmsDeliveryError extends Error {
	readonly status: number
	readonly code: string

	constructor(code: string, status = 503) {
		super("Unable to send SMS. Please try again.")
		Object.setPrototypeOf(this, new.target.prototype)
		this.name = "SmsDeliveryError"
		this.code = code
		this.status = status
	}
}

export class SmsConfigurationError extends Error {
	readonly code: string

	constructor(code: string) {
		super("SMS provider configuration is incomplete.")
		Object.setPrototypeOf(this, new.target.prototype)
		this.name = "SmsConfigurationError"
		this.code = code
	}
}

export function smsErrorDiagnostic(provider: SmsProviderName | "unknown", error: unknown) {
	const metadata = error && typeof error === "object" ? error as Record<string, unknown> : {}
	const rawCode = typeof metadata.code === "string" ? metadata.code : ""
	const httpStatus = Number(metadata.status ?? metadata.statusCode ?? (metadata.response as Record<string, unknown> | undefined)?.status)
	const code = /^[A-Z0-9_-]{1,32}$/i.test(rawCode) ? rawCode : undefined
	const timeout = code === "ETIMEDOUT" || code === "ECONNABORTED"
	return {
		provider,
		category: timeout ? "timeout" : httpStatus >= 400 ? "provider_rejected" : "delivery_failed",
		...(code ? { code } : {}),
		...(Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? { httpStatus } : {}),
	}
}
