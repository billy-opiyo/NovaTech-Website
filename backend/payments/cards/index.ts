export type CardPaymentPayload = {
	amount: number
	currency?: string
	customerEmail: string
	reference: string
	metadata?: Record<string, unknown>
}

export async function createCardPaymentIntent({
	amount,
	currency = "KES",
	customerEmail,
	reference,
	metadata,
}: CardPaymentPayload) {
	return {
		ok: true,
		provider: "card",
		amount,
		currency,
		customerEmail,
		reference,
		status: "pending",
		metadata,
		providerReference: `card_${Date.now()}`,
	}
}

export async function verifyCardPayment(reference: string) {
	return {
		ok: true,
		provider: "card",
		reference,
		status: "completed",
		message: "Card payment verified (stub implementation).",
	}
}
