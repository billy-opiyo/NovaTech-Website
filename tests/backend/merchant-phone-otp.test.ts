import { test } from "node:test"
import assert from "node:assert/strict"
import {
	MERCHANT_PHONE_OTP_LIFETIME_MS,
	MERCHANT_PHONE_OTP_MAX_ATTEMPTS,
	MERCHANT_PHONE_OTP_COOLDOWN_MS,
	sendMerchantPhoneOtp,
	verifyMerchantPhoneOtp,
	type MerchantPhoneOtpStore,
	type StoredMerchantPhoneOtp,
} from "../../backend/lib/merchant-phone-otp"
import { hashMerchantVerificationOtp } from "../../backend/lib/merchant-verification-secrets"
import { createPrismaMerchantPhoneOtpStore } from "../../backend/lib/merchant-phone-otp-store"
import { SmsDeliveryError } from "../../backend/lib/sms/types"

function createMemoryStore() {
	let record: StoredMerchantPhoneOtp | null = null
	let sentAt: Date | null = null
	let verified = false
	const store: MerchantPhoneOtpStore = {
		async reserve(input) {
			if (sentAt && sentAt > input.cooldownCutoff) return false
			record = { id: input.id, phoneOtpHash: input.hash, phoneOtpSalt: input.salt, phoneOtpExpiresAt: input.expiresAt, phoneOtpAttempts: 0 }
			sentAt = input.sentAt
			return true
		},
		async release(input) {
			if (record?.id === input.id && record.phoneOtpHash === input.hash && sentAt?.getTime() === input.sentAt.getTime()) {
				record = { ...record, phoneOtpHash: null, phoneOtpSalt: null, phoneOtpExpiresAt: null, phoneOtpAttempts: 0 }
				sentAt = null
			}
		},
		async find(id) {
			return record?.id === id ? { ...record } : null
		},
		async incrementAttempts(input) {
			if (!record || record.id !== input.id || record.phoneOtpHash !== input.hash || !record.phoneOtpExpiresAt || record.phoneOtpExpiresAt <= input.now || record.phoneOtpAttempts >= MERCHANT_PHONE_OTP_MAX_ATTEMPTS) return false
			record.phoneOtpAttempts++
			return true
		},
		async consume(input) {
			if (!record || record.id !== input.id || record.phoneOtpHash !== input.hash || !record.phoneOtpExpiresAt || record.phoneOtpExpiresAt <= input.now || record.phoneOtpAttempts >= MERCHANT_PHONE_OTP_MAX_ATTEMPTS) return false
			record = { ...record, phoneOtpHash: null, phoneOtpSalt: null, phoneOtpExpiresAt: null, phoneOtpAttempts: 0 }
			verified = true
			return true
		},
	}
	return { store, getRecord: () => record, wasVerified: () => verified }
}

test("OTP send stores only the salted hash and enforces a concurrency-safe cooldown", async () => {
	const memory = createMemoryStore()
	const now = new Date("2026-10-05T09:00:00.000Z")
	let message = ""
	let unblockSend!: () => void
	const sendGate = new Promise<void>((resolve) => { unblockSend = resolve })
	let sendStarted!: () => void
	const started = new Promise<void>((resolve) => { sendStarted = resolve })
	const first = sendMerchantPhoneOtp({
		store: memory.store,
		profileId: "profile-1",
		phone: "+254712345678",
		now,
		generateCode: () => ({ code: "123456", salt: "salt-1" }),
		sendSms: async (_to, body) => { message = body; sendStarted(); await sendGate },
	})
	await started
	const duplicate = await sendMerchantPhoneOtp({
		store: memory.store,
		profileId: "profile-1",
		phone: "+254712345678",
		now: new Date(now.getTime() + 1),
		generateCode: () => ({ code: "654321", salt: "salt-2" }),
		sendSms: async () => assert.fail("cooldown must prevent another provider call"),
	})
	assert.equal(duplicate, "cooldown")
	unblockSend()
	assert.equal(await first, "sent")
	const stored = memory.getRecord()
	assert.equal(stored?.phoneOtpHash, hashMerchantVerificationOtp("123456", "salt-1"))
	assert.notEqual(stored?.phoneOtpHash, "123456")
	assert.equal(stored?.phoneOtpExpiresAt?.getTime(), now.getTime() + MERCHANT_PHONE_OTP_LIFETIME_MS)
	assert.match(message, /123456/)
	assert.ok(!JSON.stringify(stored).includes("123456"))
	assert.equal(MERCHANT_PHONE_OTP_COOLDOWN_MS, 60_000)
})

test("provider failure releases the OTP reservation for retry", async () => {
	const memory = createMemoryStore()
	await assert.rejects(() => sendMerchantPhoneOtp({
		store: memory.store,
		profileId: "profile-2",
		phone: "+254712345678",
		now: new Date("2026-10-05T09:00:00.000Z"),
		generateCode: () => ({ code: "111222", salt: "salt" }),
		sendSms: async () => { throw new SmsDeliveryError("SMS_PROVIDER_FAILURE") },
	}))
	assert.equal(memory.getRecord()?.phoneOtpHash, null)
	assert.equal(await sendMerchantPhoneOtp({
		store: memory.store,
		profileId: "profile-2",
		phone: "+254712345678",
		now: new Date("2026-10-05T09:00:01.000Z"),
		generateCode: () => ({ code: "333444", salt: "salt-2" }),
		sendSms: async () => undefined,
	}), "sent")
})

test("ambiguous delivery timeout leaves its OTP valid for a late-arriving SMS", async () => {
	const memory = createMemoryStore()
	await assert.rejects(() => sendMerchantPhoneOtp({
		store: memory.store,
		profileId: "profile-timeout",
		phone: "+254712345678",
		now: new Date("2026-10-05T09:00:00.000Z"),
		generateCode: () => ({ code: "222333", salt: "salt-timeout" }),
		sendSms: async () => { throw new SmsDeliveryError("SMS_PROVIDER_TIMEOUT") },
	}))
	assert.ok(memory.getRecord()?.phoneOtpHash)
})

test("OTP expiry, wrong-code attempt cap, and one-time consumption are enforced", async () => {
	const expired = createMemoryStore()
	await sendMerchantPhoneOtp({
		store: expired.store,
		profileId: "expired",
		phone: "+254712345678",
		now: new Date("2026-10-05T09:00:00.000Z"),
		generateCode: () => ({ code: "123456", salt: "expired-salt" }),
		sendSms: async () => undefined,
	})
	assert.equal(await verifyMerchantPhoneOtp({ store: expired.store, profileId: "expired", code: "123456", now: new Date("2026-10-05T09:10:00.001Z") }), "expired")

	const attempts = createMemoryStore()
	await sendMerchantPhoneOtp({
		store: attempts.store,
		profileId: "attempts",
		phone: "+254712345678",
		now: new Date("2026-10-05T09:00:00.000Z"),
		generateCode: () => ({ code: "123456", salt: "attempt-salt" }),
		sendSms: async () => undefined,
	})
	const attemptNow = new Date("2026-10-05T09:01:00.000Z")
	for (let attempt = 1; attempt < MERCHANT_PHONE_OTP_MAX_ATTEMPTS; attempt++) {
		assert.equal(await verifyMerchantPhoneOtp({ store: attempts.store, profileId: "attempts", code: "000000", now: attemptNow }), "invalid")
	}
	assert.equal(await verifyMerchantPhoneOtp({ store: attempts.store, profileId: "attempts", code: "000000", now: attemptNow }), "too_many_attempts")
	assert.equal((await attempts.store.find("attempts"))?.phoneOtpAttempts, MERCHANT_PHONE_OTP_MAX_ATTEMPTS)

	const valid = createMemoryStore()
	await sendMerchantPhoneOtp({
		store: valid.store,
		profileId: "valid",
		phone: "+254712345678",
		now: new Date("2026-10-05T09:00:00.000Z"),
		generateCode: () => ({ code: "987654", salt: "valid-salt" }),
		sendSms: async () => undefined,
	})
	const validNow = new Date("2026-10-05T09:01:00.000Z")
	assert.equal(await verifyMerchantPhoneOtp({ store: valid.store, profileId: "valid", code: "987654", now: validNow }), "verified")
	assert.equal(valid.wasVerified(), true)
	assert.equal(await verifyMerchantPhoneOtp({ store: valid.store, profileId: "valid", code: "987654", now: validNow }), "expired")
})

test("parallel valid OTP submissions can consume a code only once", async () => {
	const memory = createMemoryStore()
	await sendMerchantPhoneOtp({
		store: memory.store,
		profileId: "race",
		phone: "+254712345678",
		generateCode: () => ({ code: "654321", salt: "race-salt" }),
		sendSms: async () => undefined,
	})
	const results = await Promise.all([
		verifyMerchantPhoneOtp({ store: memory.store, profileId: "race", code: "654321" }),
		verifyMerchantPhoneOtp({ store: memory.store, profileId: "race", code: "654321" }),
	])
	assert.equal(results.filter((result) => result === "verified").length, 1)
	assert.equal(results.filter((result) => result === "expired").length, 1)
})

test("Prisma OTP adapter uses conditional atomic updates for cooldown and one-use consumption", async () => {
	const updates: unknown[] = []
	const fakeDelegate = {
		updateMany: async (query: unknown) => { updates.push(query); return { count: 1 } },
		findUnique: async () => null,
	} as unknown as Parameters<typeof createPrismaMerchantPhoneOtpStore>[0]
	const store = createPrismaMerchantPhoneOtpStore(fakeDelegate)
	const now = new Date("2026-10-05T09:00:00.000Z")
	await store.reserve({ id: "profile", cooldownCutoff: new Date(now.getTime() - 60_000), sentAt: now, hash: "hash", salt: "salt", expiresAt: new Date(now.getTime() + 600_000) })
	await store.consume({ id: "profile", hash: "hash", now })

	const reservation = updates[0] as { where: { OR: unknown[] }; data: Record<string, unknown> }
	assert.deepEqual(reservation.where.OR, [
		{ phoneOtpSentAt: null },
		{ phoneOtpSentAt: { lte: new Date(now.getTime() - 60_000) } },
	])
	assert.equal(reservation.data.phoneOtpHash, "hash")
	const consumption = updates[1] as { where: Record<string, unknown>; data: Record<string, unknown> }
	assert.deepEqual(consumption.where, {
		id: "profile",
		phoneOtpHash: "hash",
		phoneOtpExpiresAt: { gt: now },
		phoneOtpAttempts: { lt: MERCHANT_PHONE_OTP_MAX_ATTEMPTS },
	})
	assert.equal(consumption.data.phoneOtpHash, null)
})
