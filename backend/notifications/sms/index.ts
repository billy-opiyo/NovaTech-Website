export type { SmsPayload } from "../../lib/sms"

export const {
	sendSmsMessage,
	sendOrderConfirmation,
	sendOrderStatusUpdate,
	sendPaymentRequest,
	sendSupportMessage,
} = require("../../lib/sms")
