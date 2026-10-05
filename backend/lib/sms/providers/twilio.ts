import { SmsConfigurationError, smsProviderTimeout, type SmsProvider, type SmsProviderPayload, type SmsProviderReceipt } from "../types"

interface TwilioClient {
	messages: {
		create(options: { body: string; from?: string; to: string }): Promise<{ sid: string; status: string }>
	}
}

type TwilioClientFactory = (accountSid: string, authToken: string, options?: { timeout: number }) => TwilioClient
type Environment = Record<string, string | undefined>

function createSdkClient(accountSid: string, authToken: string) {
	const createClient = require("twilio") as TwilioClientFactory
	return createClient(accountSid, authToken)
}

export function createTwilioProvider(options: {
	getEnvironment?: () => Environment
	createClient?: TwilioClientFactory
} = {}): SmsProvider {
	const getEnvironment = options.getEnvironment || (() => process.env)
	const createClient = options.createClient || createSdkClient
	let cachedKey = ""
	let cachedClient: TwilioClient | undefined

	return {
		async send(payload: SmsProviderPayload): Promise<SmsProviderReceipt> {
			const environment = getEnvironment()
			const accountSid = environment.TWILIO_ACCOUNT_SID
			const authToken = environment.TWILIO_AUTH_TOKEN
			if (!accountSid || !authToken) throw new SmsConfigurationError("TWILIO_CREDENTIALS_MISSING")

			const key = `${accountSid}\u0000${authToken}`
			if (!cachedClient || cachedKey !== key) {
				cachedClient = createClient(accountSid, authToken, { timeout: smsProviderTimeout(environment) })
				cachedKey = key
			}

			const senderId = payload.senderId || environment.TWILIO_PHONE_NUMBER || undefined
			const result = await cachedClient.messages.create({
				body: payload.message,
				from: senderId,
				to: payload.to,
			})
			return { messageId: result.sid, status: result.status, senderId }
		},
	}
}
