export type SmsPayload = {
	to: string
	message: string
	senderId?: string
}

export async function sendSmsMessage({
	to,
	message,
	senderId = "NOVATECH",
}: SmsPayload) {
	return {
		ok: true,
		provider: "sms",
		to,
		senderId,
		message,
		sentAt: new Date().toISOString(),
		messageId: `sms-${Date.now()}`,
	}
}
