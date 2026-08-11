export type { WhatsAppPayload } from "../../lib/whatsapp"

export const {
	sendWhatsAppMessage,
	sendOrderConfirmation,
	sendOrderStatusUpdate,
	sendPaymentRequest,
	sendSupportMessage,
} = require("../../lib/whatsapp")