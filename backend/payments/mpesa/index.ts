export type MpesaPayload = {
	amount: number
	phone: string
	reference: string
	metadata?: Record<string, unknown>
}

export async function initiateMpesaPayment({
	amount,
	phone,
	reference,
	metadata,
}: MpesaPayload) {
	return {
		ok: true,
		provider: "mpesa",
		amount,
		phone,
		reference,
		status: "pending",
		metadata,
		checkoutRequestId: `mpesa_${Date.now()}`,
	}
}

export async function verifyMpesaPayment(reference: string) {
	return {
		ok: true,
		provider: "mpesa",
		reference,
		status: "completed",
		message: "MPesa payment verified (stub implementation).",
	}
}
