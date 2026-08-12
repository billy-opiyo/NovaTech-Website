import twilio from "twilio"

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

let twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
	if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
		throw new Error("Twilio credentials are not configured")
	}

	if (!twilioClient) {
		twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
	}

	return twilioClient
}

interface SmsMessage {
	to: string
	body: string
}

export interface SmsPayload {
	to: string
	message: string
	senderId?: string
}

export async function sendSmsMessage({
	to,
	message,
	senderId,
}: SmsPayload) {
	try {
		// Format phone number to E.164 format if it starts with 0 (Kenyan format)
		const formattedTo = to.startsWith("0") ? `+254${to.slice(1)}` : to

		const result = await getTwilioClient().messages.create({
			body: message,
			from: senderId || TWILIO_PHONE_NUMBER || undefined,
			to: formattedTo,
		})

		return {
			ok: true,
			provider: "sms",
			to: formattedTo,
			senderId: senderId || TWILIO_PHONE_NUMBER,
			message,
			sentAt: new Date().toISOString(),
			messageId: result.sid,
			status: result.status,
		}
	} catch (error) {
		console.error("SMS send error:", error)
		throw error
	}
}

export async function sendOrderConfirmation(
	phone: string,
	orderId: string,
	total: number,
) {
	return sendSmsMessage({
		to: phone,
message: `NovaTech Store: Your order #${orderId} has been confirmed. Total: KES ${total.toLocaleString()}. Thank you for shopping with us!`,
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

	const message =
		statusMessages[status] || `Your order #${orderId} status: ${status}`

	return sendSmsMessage({
		to: phone,
message: `NovaTech Store Order Update\n\nOrder: #${orderId}\nStatus: ${status.replace(/_/g, " ")}\n\n${message}\n\nTrack: ${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${orderId}`,
	})
}

export async function sendPaymentRequest(
	phone: string,
	amount: number,
	orderId: string,
) {
	return sendSmsMessage({
		to: phone,
message: `NovaTech Store: Payment request for order #${orderId}. Amount: KES ${amount.toLocaleString()}. You will receive an M-Pesa prompt shortly.`,
	})
}

export async function sendSupportMessage(phone: string, customerName: string) {
	return sendSmsMessage({
		to: phone,
message: `Hello ${customerName}, thank you for contacting NovaTech Store support. We will get back to you shortly.`,
	})
}