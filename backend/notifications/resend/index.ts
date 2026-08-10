export type ResendMessageInput = {
	to: string
	subject: string
	html: string
	from?: string
}

export async function sendResendEmail({
	to,
	subject,
	html,
	from = "ElectroBuy <orders@electrobuy.co.ke>",
}: ResendMessageInput) {
	return {
		ok: true,
		provider: "resend",
		to,
		subject,
		from,
		html,
		sentAt: new Date().toISOString(),
		message: "Resend email stub executed successfully.",
	}
}
