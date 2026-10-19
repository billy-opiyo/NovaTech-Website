import crypto from "crypto"
import { hashMerchantVerificationOtp } from "./merchant-verification-secrets"
import { SmsDeliveryError } from "./sms/types"

export const MERCHANT_PHONE_OTP_COOLDOWN_MS = 60_000
export const MERCHANT_PHONE_OTP_LIFETIME_MS = 10 * 60_000
export const MERCHANT_PHONE_OTP_MAX_ATTEMPTS = 5

export interface StoredMerchantPhoneOtp {
	id: string
	phoneOtpHash: string | null
	phoneOtpSalt: string | null
	phoneOtpExpiresAt: Date | null
	phoneOtpAttempts: number
}

export interface MerchantPhoneOtpStore {
	reserve(input: {
		id: string
		cooldownCutoff: Date
		sentAt: Date
		hash: string
		salt: string
		expiresAt: Date
	}): Promise<boolean>
	release(input: { id: string; sentAt: Date; hash: string }): Promise<void>
	find(id: string): Promise<StoredMerchantPhoneOtp | null>
	incrementAttempts(input: { id: string; hash: string; now: Date }): Promise<boolean>
	consume(input: { id: string; hash: string; now: Date }): Promise<boolean>
}

export type MerchantPhoneOtpVerification = "verified" | "invalid" | "expired" | "too_many_attempts"

function generateOtp() {
	return {
		code: crypto.randomInt(100000, 1000000).toString(),
		salt: crypto.randomBytes(16).toString("base64url"),
	}
}

export async function sendMerchantPhoneOtp(options: {
	store: MerchantPhoneOtpStore
	profileId: string
	phone: string
	sendSms: (to: string, message: string) => Promise<unknown>
	now?: Date
	generateCode?: () => { code: string; salt: string }
}): Promise<"sent" | "cooldown"> {
	const now = options.now || new Date()
	const { code, salt } = (options.generateCode || generateOtp)()
	const hash = hashMerchantVerificationOtp(code, salt)
	const claimed = await options.store.reserve({
		id: options.profileId,
		cooldownCutoff: new Date(now.getTime() - MERCHANT_PHONE_OTP_COOLDOWN_MS),
		sentAt: now,
		hash,
		salt,
		expiresAt: new Date(now.getTime() + MERCHANT_PHONE_OTP_LIFETIME_MS),
	})
	if (!claimed) return "cooldown"

	try {
		await options.sendSms(options.phone, `Nurava Tech verification code: ${code}. It expires in 10 minutes. Do not share this code.`)
	} catch (error) {
		// A timeout is ambiguous: the provider may still deliver the in-flight SMS.
		// Keep that code valid so a late-arriving message is not unexpectedly rejected.
		if (!(error instanceof SmsDeliveryError && error.code === "SMS_PROVIDER_TIMEOUT")) {
			await options.store.release({ id: options.profileId, sentAt: now, hash })
		}
		throw error
	}
	return "sent"
}

export async function verifyMerchantPhoneOtp(options: {
	store: MerchantPhoneOtpStore
	profileId: string
	code: string
	now?: Date
}): Promise<MerchantPhoneOtpVerification> {
	const now = options.now || new Date()
	const record = await options.store.find(options.profileId)
	if (!record?.phoneOtpHash || !record.phoneOtpSalt || !record.phoneOtpExpiresAt || record.phoneOtpExpiresAt <= now) return "expired"
	if (record.phoneOtpAttempts >= MERCHANT_PHONE_OTP_MAX_ATTEMPTS) return "too_many_attempts"

	const expected = Buffer.from(record.phoneOtpHash, "hex")
	const actual = Buffer.from(hashMerchantVerificationOtp(options.code, record.phoneOtpSalt), "hex")
	if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
		const incremented = await options.store.incrementAttempts({ id: record.id, hash: record.phoneOtpHash, now })
		if (!incremented) {
			const latest = await options.store.find(record.id)
			return latest?.phoneOtpAttempts && latest.phoneOtpAttempts >= MERCHANT_PHONE_OTP_MAX_ATTEMPTS
				? "too_many_attempts"
				: "expired"
		}
		const latest = await options.store.find(record.id)
		return latest && latest.phoneOtpAttempts >= MERCHANT_PHONE_OTP_MAX_ATTEMPTS ? "too_many_attempts" : "invalid"
	}

	const consumed = await options.store.consume({ id: record.id, hash: record.phoneOtpHash, now })
	return consumed ? "verified" : "expired"
}
