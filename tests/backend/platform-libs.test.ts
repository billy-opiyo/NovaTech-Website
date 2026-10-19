import { test } from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import { rateLimiter } from "../../backend/middleware/rateLimiter"
import { sendEmail } from "../../backend/lib/email"
import { createAfricaTalkingProvider } from "../../backend/lib/sms/providers/africastalking"
import { SmsConfigurationError } from "../../backend/lib/sms/types"
import prisma from "../../backend/lib/db"
import { sendWhatsAppMessage } from "../../backend/lib/whatsapp"

test("rate limiter allows the first 60 requests and rejects the next", () => {
	const ip = `test-${Date.now()}-${Math.random()}`
	const request = () => new NextRequest("http://localhost/api/test", { headers: { "x-forwarded-for": ip } })
	for (let i = 0; i < 60; i++) assert.equal(rateLimiter(request()), null)
	const limited = rateLimiter(request())
	assert.ok(limited)
	assert.equal(limited?.status, 429)
})

test("scoped distributed rate limiter blocks request 61 without connecting to a database", async () => {
	const delegate = prisma.rateLimitBucket
	const originalUpsert = delegate.upsert
	const originalDeleteMany = delegate.deleteMany
	const originalRandom = Math.random
	let count = 0
	delegate.upsert = (async () => ({ count: ++count })) as typeof delegate.upsert
	delegate.deleteMany = (async () => ({ count: 0 })) as typeof delegate.deleteMany
	Math.random = () => 1
	try {
		const request = () => new NextRequest("http://localhost/api/test", { headers: { "x-forwarded-for": `scoped-${Date.now()}` } })
		for (let i = 0; i < 60; i++) assert.equal(await rateLimiter(request(), "merchant-verification-phone"), null)
		const limited = await rateLimiter(request(), "merchant-verification-phone")
		assert.equal(limited?.status, 429)
	} finally {
		delegate.upsert = originalUpsert
		delegate.deleteMany = originalDeleteMany
		Math.random = originalRandom
	}
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

test("Africa's Talking provider fails closed without credentials and never sends during tests", async () => {
	const provider = createAfricaTalkingProvider({
		getEnvironment: () => ({}),
		createClient: () => assert.fail("SDK client must not be created without credentials"),
	})
	await assert.rejects(() => provider.send({ to: "+254712345678", message: "Test" }), (error: unknown) => {
		assert.ok(error instanceof SmsConfigurationError)
		assert.equal(error.message, "SMS provider configuration is incomplete.")
		return true
	})
})

test("WhatsApp integration validates message shape before calling provider", async () => {
	await assert.rejects(() => sendWhatsAppMessage({ to: "254712345678" }), /Either templateName or text must be provided/)
})
