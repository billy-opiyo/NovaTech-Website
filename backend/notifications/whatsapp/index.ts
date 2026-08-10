export type WhatsAppPayload = {
	to: string
	message: string
	template?: string
}

export async function sendWhatsAppMessage({
	to,
	message,
	template = "generic",
}: WhatsAppPayload) {
	return {
		ok: true,
		provider: "whatsapp",
		to,
		template,
		message,
		sentAt: new Date().toISOString(),
		messageId: `wa-${Date.now()}`,
	}
}
