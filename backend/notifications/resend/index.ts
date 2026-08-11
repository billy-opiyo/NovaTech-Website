export type ResendMessageInput = {
	to: string
	subject: string
	html: string
	from?: string
}

export { sendEmail as sendResendEmail } from "../../lib/email"