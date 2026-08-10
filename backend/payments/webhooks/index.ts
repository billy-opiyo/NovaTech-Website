export type WebhookEvent = {
	provider: string
	event: string
	payload: Record<string, unknown>
	receivedAt: string
}

export async function handleWebhook(event: WebhookEvent) {
	return {
		ok: true,
		received: true,
		provider: event.provider,
		event: event.event,
		receivedAt: event.receivedAt,
		message: `Webhook ${event.event} received for ${event.provider}.`,
	}
}
