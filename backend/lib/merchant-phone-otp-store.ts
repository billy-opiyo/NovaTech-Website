import type { PrismaClient } from "@prisma/client"
import {
	MERCHANT_PHONE_OTP_MAX_ATTEMPTS,
	type MerchantPhoneOtpStore,
} from "./merchant-phone-otp"

type MerchantVerificationDelegate = Pick<PrismaClient, "merchantVerificationProfile">["merchantVerificationProfile"]

export function createPrismaMerchantPhoneOtpStore(delegate: MerchantVerificationDelegate): MerchantPhoneOtpStore {
	return {
		async reserve({ id, cooldownCutoff, sentAt, hash, salt, expiresAt }) {
			const result = await delegate.updateMany({
				where: {
					id,
					OR: [
						{ phoneOtpSentAt: null },
						{ phoneOtpSentAt: { lte: cooldownCutoff } },
					],
				},
				data: {
					phoneOtpHash: hash,
					phoneOtpSalt: salt,
					phoneOtpExpiresAt: expiresAt,
					phoneOtpAttempts: 0,
					phoneOtpSentAt: sentAt,
				},
			})
			return result.count === 1
		},
		async release({ id, sentAt, hash }) {
			await delegate.updateMany({
				where: { id, phoneOtpHash: hash, phoneOtpSentAt: sentAt },
				data: { phoneOtpHash: null, phoneOtpSalt: null, phoneOtpExpiresAt: null, phoneOtpAttempts: 0, phoneOtpSentAt: null },
			})
		},
		async find(id) {
			return delegate.findUnique({
				where: { id },
				select: { id: true, phoneOtpHash: true, phoneOtpSalt: true, phoneOtpExpiresAt: true, phoneOtpAttempts: true },
			})
		},
		async incrementAttempts({ id, hash, now }) {
			const result = await delegate.updateMany({
				where: { id, phoneOtpHash: hash, phoneOtpExpiresAt: { gt: now }, phoneOtpAttempts: { lt: MERCHANT_PHONE_OTP_MAX_ATTEMPTS } },
				data: { phoneOtpAttempts: { increment: 1 } },
			})
			return result.count === 1
		},
		async consume({ id, hash, now }) {
			const result = await delegate.updateMany({
				where: { id, phoneOtpHash: hash, phoneOtpExpiresAt: { gt: now }, phoneOtpAttempts: { lt: MERCHANT_PHONE_OTP_MAX_ATTEMPTS } },
				data: { phoneVerifiedAt: now, phoneOtpHash: null, phoneOtpSalt: null, phoneOtpExpiresAt: null, phoneOtpAttempts: 0 },
			})
			return result.count === 1
		},
	}
}
