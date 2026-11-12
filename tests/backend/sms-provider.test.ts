import { test } from "node:test"
import assert from "node:assert/strict"
import { createSmsSender } from "../../backend/lib/sms"
import { normalizeSmsPhoneNumber } from "../../backend/lib/sms/phone"
import { createAfricaTalkingProvider } from "../../backend/lib/sms/providers/africastalking"
import { createTwilioProvider } from "../../backend/lib/sms/providers/twilio"
import { SmsDeliveryError } from "../../backend/lib/sms/types"

test("SMS phone normalization supports Kenyan formats and preserves international numbers", () => {
	const cases: Array<[string, string]> = [
		["0712345678", "+254712345678"],
		["0112345678", "+254112345678"],
		["254712345678", "+254712345678"],
		["+254712345678", "+254712345678"],
		["+447911123456", "+447911123456"],
		["447911123456", "+447911123456"],
		["00447911123456", "+447911123456"],
	]
	for (const [input, expected] of cases) assert.equal(normalizeSmsPhoneNumber(input), expected)
	for (const invalid of ["", "abc", "07123", "+0123456789", "0000000000"]) {
		assert.throws(() => normalizeSmsPhoneNumber(invalid), (error: unknown) => error instanceof SmsDeliveryError && error.code === "INVALID_PHONE_NUMBER")
	}
})

test("SMS defaults to Africa's Talking and never loads Twilio as a fallback", async () => {
	const loaded: string[] = []
	const send = createSmsSender({
		getEnvironment: () => ({}),
		loadProvider: async (provider) => {
			loaded.push(provider)
			return { send: async (payload) => ({ messageId: "at-1", status: "Success", senderId: payload.senderId }) }
		},
	})
	const result = await send({ to: "0712345678", message: "hello" })
	assert.deepEqual(loaded, ["africastalking"])
	assert.equal(result.to, "+254712345678")
	assert.equal(result.messageId, "at-1")
})

test("Twilio is loaded only when SMS_PROVIDER explicitly selects it", async () => {
	const loaded: string[] = []
	const send = createSmsSender({
		getEnvironment: () => ({ SMS_PROVIDER: "twilio" }),
		loadProvider: async (provider) => {
			loaded.push(provider)
			return { send: async () => ({ messageId: "twilio-1", status: "queued" }) }
		},
	})
	await send({ to: "+254712345678", message: "hello" })
	assert.deepEqual(loaded, ["twilio"])
})

test("invalid provider config fails closed and provider errors are redacted", async () => {
	let configDiagnostic: unknown
	const invalid = createSmsSender({
		getEnvironment: () => ({ SMS_PROVIDER: "other" }),
		logFailure: (details) => { configDiagnostic = details },
	})
	await assert.rejects(() => invalid({ to: "+254712345678", message: "hello" }), (error: unknown) => {
		assert.ok(error instanceof SmsDeliveryError)
		assert.equal(error.code, "SMS_PROVIDER_INVALID")
		assert.equal(error.message, "Unable to send SMS. Please try again.")
		return true
	})
	assert.deepEqual(configDiagnostic, { provider: "unknown", category: "delivery_failed", code: "SMS_PROVIDER_INVALID" })

	let diagnostic: unknown
	const failing = createSmsSender({
		getEnvironment: () => ({ SMS_PROVIDER: "africastalking" }),
		loadProvider: async () => ({ send: async () => { throw Object.assign(new Error("secret OTP and API key"), { code: "ETIMEDOUT" }) } }),
		logFailure: (details) => { diagnostic = details },
	})
	await assert.rejects(() => failing({ to: "+254712345678", message: "private code 123456" }), (error: unknown) => {
		assert.ok(error instanceof SmsDeliveryError)
		assert.equal(error.message, "Unable to send SMS. Please try again.")
		return true
	})
	assert.deepEqual(diagnostic, { provider: "africastalking", category: "timeout", code: "ETIMEDOUT" })
})

test("Africa's Talking adapter sends through its official API and maps the receipt", async () => {
	let sentRequest: { url: string | URL; init?: RequestInit } | undefined
	const provider = createAfricaTalkingProvider({
		getEnvironment: () => ({ AFRICASTALKING_USERNAME: "sandbox", AFRICASTALKING_API_KEY: "test-key", AFRICASTALKING_SENDER_ID: "NURAVA" }),
		fetcher: async (url, init) => {
			sentRequest = { url, init }
			return new Response(JSON.stringify({ SMSMessageData: { Recipients: [{ statusCode: 101, status: "Success", messageId: "at-message-1" }] } }), { status: 201 })
		},
	})
	const receipt = await provider.send({ to: "+254712345678", message: "test" })
	assert.equal(sentRequest?.url, "https://api.sandbox.africastalking.com/version1/messaging")
	assert.equal((sentRequest?.init?.headers as Record<string, string>).apiKey, "test-key")
	assert.deepEqual(Object.fromEntries(new URLSearchParams(String(sentRequest?.init?.body))), {
		username: "sandbox", to: "+254712345678", message: "test", bulkSMSMode: "1", from: "NURAVA",
	})
	assert.deepEqual(receipt, { messageId: "at-message-1", status: "Success", senderId: "NURAVA" })
})

test("Africa's Talking production calls use the production API and omit an unset sender ID", async () => {
	let sentRequest: { url: string | URL; init?: RequestInit } | undefined
	const provider = createAfricaTalkingProvider({
		getEnvironment: () => ({ AFRICASTALKING_USERNAME: "nurava-production", AFRICASTALKING_API_KEY: "production-key" }),
		fetcher: async (url, init) => {
			sentRequest = { url, init }
			return new Response(JSON.stringify({ SMSMessageData: { Recipients: [{ statusCode: 102, status: "Queued" }] } }), { status: 201 })
		},
	})
	await provider.send({ to: "+254712345678", message: "test" })
	assert.equal(sentRequest?.url, "https://api.africastalking.com/version1/messaging")
	assert.equal(new URLSearchParams(String(sentRequest?.init?.body)).has("from"), false)
})

test("Africa's Talking rejection and timeout surface without a provider fallback", async () => {
	const rejected = createAfricaTalkingProvider({
		getEnvironment: () => ({ AFRICASTALKING_USERNAME: "sandbox", AFRICASTALKING_API_KEY: "test-key" }),
		fetcher: async () => new Response(JSON.stringify({ SMSMessageData: { Recipients: [{ statusCode: 405, status: "Insufficient Balance" }] } }), { status: 201 }),
	})
	await assert.rejects(() => rejected.send({ to: "+254712345678", message: "test" }), /Provider rejected the SMS/)

	const timeout = createAfricaTalkingProvider({
		getEnvironment: () => ({ AFRICASTALKING_USERNAME: "sandbox", AFRICASTALKING_API_KEY: "test-key" }),
		fetcher: (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
		timeoutMs: 5,
	})
	await assert.rejects(() => timeout.send({ to: "+254712345678", message: "test" }), (error: unknown) => (error as { code?: string }).code === "ETIMEDOUT")
})

test("Twilio adapter remains available when explicitly selected", async () => {
	let sent: unknown
	const provider = createTwilioProvider({
		getEnvironment: () => ({ TWILIO_ACCOUNT_SID: "AC-test", TWILIO_AUTH_TOKEN: "test-token", TWILIO_PHONE_NUMBER: "+15550001111" }),
		createClient: () => ({ messages: { create: async (message) => {
			sent = message
			return { sid: "SM-test", status: "queued" }
		} } }),
	})
	const receipt = await provider.send({ to: "+254712345678", message: "test" })
	assert.deepEqual(sent, { body: "test", from: "+15550001111", to: "+254712345678" })
	assert.deepEqual(receipt, { messageId: "SM-test", status: "queued", senderId: "+15550001111" })
})
