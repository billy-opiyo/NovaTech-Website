import { SmsConfigurationError, smsProviderTimeout, type SmsProvider, type SmsProviderPayload, type SmsProviderReceipt } from "../types"

type Environment = Record<string, string | undefined>
type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>

function responseReceipt(response: unknown): SmsProviderReceipt {
	const data = response && typeof response === "object"
		? (response as { SMSMessageData?: { Recipients?: Array<Record<string, unknown>> } }).SMSMessageData
		: undefined
	const recipient = data?.Recipients?.[0]
	if (!recipient) throw Object.assign(new Error("Provider did not acknowledge the SMS"), { code: "EMPTY_PROVIDER_RESPONSE" })

	const statusCode = Number(recipient.statusCode)
	if (![100, 101, 102].includes(statusCode)) {
		throw Object.assign(new Error("Provider rejected the SMS"), {
			code: `AT_${Number.isFinite(statusCode) ? statusCode : "UNKNOWN"}`,
			status: statusCode >= 400 ? 502 : undefined,
		})
	}

	return {
		messageId: typeof recipient.messageId === "string" ? recipient.messageId : undefined,
		status: typeof recipient.status === "string" ? recipient.status : String(statusCode),
	}
}

export function createAfricaTalkingProvider(options: {
	getEnvironment?: () => Environment
	fetcher?: Fetcher
	timeoutMs?: number
} = {}): SmsProvider {
	const getEnvironment = options.getEnvironment || (() => process.env)
	const fetcher = options.fetcher || globalThis.fetch.bind(globalThis)

	return {
		async send(payload: SmsProviderPayload) {
			const environment = getEnvironment()
			const username = environment.AFRICASTALKING_USERNAME?.trim()
			const apiKey = environment.AFRICASTALKING_API_KEY
			if (!username || !apiKey) throw new SmsConfigurationError("AFRICASTALKING_CREDENTIALS_MISSING")

			const senderId = payload.senderId?.trim() || environment.AFRICASTALKING_SENDER_ID?.trim() || undefined
			const form = new URLSearchParams({ username, to: payload.to, message: payload.message })
			form.set("bulkSMSMode", "1")
			if (senderId) form.set("from", senderId)
			const endpoint = username.toLowerCase() === "sandbox"
				? "https://api.sandbox.africastalking.com/version1/messaging"
				: "https://api.africastalking.com/version1/messaging"
			const timeoutMs = smsProviderTimeout(environment, options.timeoutMs || 15000)
			const controller = new AbortController()
			const timer = setTimeout(() => controller.abort(), timeoutMs)
			let response: Response
			try {
				response = await fetcher(endpoint, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/x-www-form-urlencoded",
						apiKey,
					},
					body: form.toString(),
					signal: controller.signal,
				})
			} catch (error) {
				if (controller.signal.aborted) throw Object.assign(new Error("SMS provider request timed out"), { code: "ETIMEDOUT" })
				throw error
			} finally {
				clearTimeout(timer)
			}

			if (response.status !== 201) {
				throw Object.assign(new Error("SMS provider rejected the request"), { code: `AT_HTTP_${response.status}`, status: response.status })
			}
			const receipt = responseReceipt(await response.json())
			return { ...receipt, senderId }
		},
	}
}
