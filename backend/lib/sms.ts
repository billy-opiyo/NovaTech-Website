import { PLATFORM_BRAND_NAME } from "./brand"
import { normalizeSmsPhoneNumber } from "./sms/phone"
import {
	SmsConfigurationError,
	SmsDeliveryError,
	smsErrorDiagnostic,
	type SmsPayload,
	type SmsProvider,
	type SmsProviderName,
} from "./sms/types"

export type { SmsPayload } from "./sms/types"
export { normalizeSmsPhoneNumber } from "./sms/phone"

type Environment = Record<string, string | undefined>
type ProviderLoader = (provider: SmsProviderName) => Promise<SmsProvider>

async function loadSmsProvider(provider: SmsProviderName): Promise<SmsProvider> {
	if (provider === "africastalking") {
		const { createAfricaTalkingProvider } = await import("./sms/providers/africastalking")
		return createAfricaTalkingProvider()
	}
	const { createTwilioProvider } = await import("./sms/providers/twilio")
	return createTwilioProvider()
}

function getSelectedProvider(environment: Environment): SmsProviderName {
	const configured = environment.SMS_PROVIDER?.trim().toLowerCase() || "africastalking"
	if (configured === "africastalking" || configured === "twilio") return configured
	throw new SmsConfigurationError("SMS_PROVIDER_INVALID")
}

export function createSmsSender(options: {
	getEnvironment?: () => Environment
	loadProvider?: ProviderLoader
	logFailure?: (details: ReturnType<typeof smsErrorDiagnostic>) => void
} = {}) {
	const getEnvironment = options.getEnvironment || (() => process.env)
	const providerLoader = options.loadProvider || loadSmsProvider
	const logFailure = options.logFailure || ((details) => console.error("SMS delivery failed", details))

	return async function sendSmsMessage({ to, message, senderId }: SmsPayload) {
		const formattedTo = normalizeSmsPhoneNumber(to)
		let providerName: SmsProviderName
		try {
			providerName = getSelectedProvider(getEnvironment())
		} catch (error) {
			logFailure(smsErrorDiagnostic("unknown", error))
			throw new SmsDeliveryError("SMS_PROVIDER_INVALID")
		}
		try {
			const provider = await providerLoader(providerName)
			const receipt = await provider.send({ to: formattedTo, message, senderId })
			return {
				ok: true,
				provider: "sms" as const,
				to: formattedTo,
				senderId: receipt.senderId,
				message,
				sentAt: new Date().toISOString(),
				messageId: receipt.messageId,
				status: receipt.status,
			}
		} catch (error) {
			if (!(error instanceof SmsDeliveryError)) {
				const diagnostic = smsErrorDiagnostic(providerName, error)
				logFailure(diagnostic)
				throw new SmsDeliveryError(
					error instanceof SmsConfigurationError
						? error.code
						: diagnostic.category === "timeout" ? "SMS_PROVIDER_TIMEOUT" : "SMS_PROVIDER_FAILURE",
				)
			}
			throw error
		}
	}
}

export const sendSmsMessage = createSmsSender()

export async function sendOrderConfirmation(
	phone: string,
	orderId: string,
	total: number,
) {
	return sendSmsMessage({
		to: phone,
		message: `${PLATFORM_BRAND_NAME}: Your order #${orderId} has been confirmed. Total: KES ${total.toLocaleString()}. Thank you for shopping with us!`,
	})
}

export async function sendOrderStatusUpdate(
	phone: string,
	orderId: string,
	status: string,
) {
	const statusMessages: Record<string, string> = {
		CONFIRMED: "Your order has been confirmed and is being prepared.",
		PROCESSING: "We are processing your order.",
		SHIPPED: "Your order has been shipped!",
		OUT_FOR_DELIVERY: "Your order is out for delivery and will arrive today!",
		DELIVERED: "Your order has been delivered. Thank you for shopping with us!",
		CANCELLED: "Your order has been cancelled. Contact support for assistance.",
	}

	const message = statusMessages[status] || `Your order #${orderId} status: ${status}`

	return sendSmsMessage({
		to: phone,
		message: `${PLATFORM_BRAND_NAME} Order Update\n\nOrder: #${orderId}\nStatus: ${status.replace(/_/g, " ")}\n\n${message}\n\nTrack: ${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${orderId}`,
	})
}

export async function sendPaymentRequest(
	phone: string,
	amount: number,
	orderId: string,
) {
	return sendSmsMessage({
		to: phone,
		message: `${PLATFORM_BRAND_NAME}: Payment request for order #${orderId}. Amount: KES ${amount.toLocaleString()}. You will receive an M-Pesa prompt shortly.`,
	})
}

export async function sendSupportMessage(phone: string, customerName: string) {
	return sendSmsMessage({
		to: phone,
		message: `Hello ${customerName}, thank you for contacting ${PLATFORM_BRAND_NAME} support. We will get back to you shortly.`,
	})
}
