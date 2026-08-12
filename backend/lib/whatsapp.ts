const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const API_VERSION = "v18.0"
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}`

interface WhatsAppMessage {
	to: string
	templateName?: string
	templateParams?: string[]
	text?: string
}

export async function sendWhatsAppMessage(message: WhatsAppMessage) {
	try {
		let body: any

		if (message.templateName) {
			body = {
				messaging_product: "whatsapp",
				to: message.to,
				type: "template",
				template: {
					name: message.templateName,
					language: { code: "en" },
					components: message.templateParams
						? [
								{
									type: "body",
									parameters: message.templateParams.map((param) => ({
										type: "text",
										text: param,
									})),
								},
							]
						: undefined,
				},
			}
		} else if (message.text) {
			body = {
				messaging_product: "whatsapp",
				to: message.to,
				type: "text",
				text: {
					body: message.text,
				},
			}
		} else {
			throw new Error("Either templateName or text must be provided")
		}

		const response = await fetch(`${BASE_URL}/messages`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${WHATSAPP_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		})

		const data = await response.json()

		if (!response.ok) {
			console.error("WhatsApp API error:", data)
			throw new Error(data.error?.message || "Failed to send WhatsApp message")
		}

		return data
	} catch (error) {
		console.error("WhatsApp send error:", error)
		throw error
	}
}

export async function sendOrderConfirmation(
	phone: string,
	orderId: string,
	total: number,
) {
	return sendWhatsAppMessage({
		to: phone.replace(/^0/, "254"),
		templateName: "order_confirmation",
		templateParams: [orderId, `KES ${total.toLocaleString()}`],
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
	}

	const message =
		statusMessages[status] || `Your order #${orderId} status: ${status}`

	return sendWhatsAppMessage({
		to: phone.replace(/^0/, "254"),
text: `📦 *NovaTech Store Order Update*\n\nOrder: #${orderId}\nStatus: ${status.replace(/_/g, " ")}\n\n${message}\n\nTrack your order: ${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${orderId}`,
	})
}

export async function sendPaymentRequest(
	phone: string,
	amount: number,
	orderId: string,
) {
	return sendWhatsAppMessage({
		to: phone.replace(/^0/, "254"),
		text: `💳 *Payment Request*\n\nOrder: #${orderId}\nAmount: KES ${amount.toLocaleString()}\n\nWe'll send an M-Pesa payment prompt to ${phone}. Please check your phone and enter your M-Pesa PIN to complete payment.`,
	})
}

export async function sendSupportMessage(phone: string, customerName: string) {
	return sendWhatsAppMessage({
		to: phone.replace(/^0/, "254"),
		templateName: "welcome_support",
		templateParams: [customerName],
	})
}
