import crypto from "crypto"

function verificationKey() {
	return process.env.AUTH_SECRET || "development-only-email-verification-key"
}

export function hashEmailVerificationCode(code: string) {
	return crypto.createHmac("sha256", verificationKey()).update(code).digest("hex")
}

export function matchesEmailVerificationCode(stored: string, code: string) {
	const expected = Buffer.from(hashEmailVerificationCode(code), "utf8")
	const actual = Buffer.from(stored, "utf8")
	return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}
