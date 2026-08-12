import { test } from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import { rateLimiter } from "../../backend/middleware/rateLimiter"
import { sendEmail } from "../../backend/lib/email"
import { sendSmsMessage } from "../../backend/lib/sms"
import { sendWhatsAppMessage } from "../../backend/lib/whatsapp"

test("rate limiter allows the first 60 requests and rejects the next", () => {
	const ip = `test-${Date.now()}-${Math.random()}`
	const request = () => new NextRequest("http://localhost/api/test", { headers: { "x-forwarded-for": ip } })
	for (let i = 0; i < 60; i++) assert.equal(rateLimiter(request()), null)
	const limited = rateLimiter(request())
	assert.ok(limited)
	assert.equal(limited?.status, 429)
})

test("email integration degrades gracefully when Resend is not configured", async (t) => {
	const original = process.env.RESEND_API_KEY
	if (original) return t.skip("RESEND_API_KEY is configured")
	delete process.env.RESEND_API_KEY
	try {
		assert.deepEqual(await sendEmail({ to: "ada@example.com", subject: "Test", html: "<p>Hello</p>" }), { id: null })
	} finally {
		if (original !== undefined) process.env.RESEND_API_KEY = original
	}
})

test("SMS integration reports missing Twilio credentials", async (t) => {
	if (process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_AUTH_TOKEN) return t.skip("Twilio is configured")
	await assert.rejects(() => sendSmsMessage({ to: "0712345678", message: "Hello" }), /Twilio credentials are not configured/)
})

test("WhatsApp integration validates message shape before calling provider", async () => {
	await assert.rejects(() => sendWhatsAppMessage({ to: "254712345678" }), /Either templateName or text must be provided/)
})
