import crypto from "crypto"

const algorithm = "aes-256-gcm"

function encryptionKey() {
	const raw = process.env.MERCHANT_VERIFICATION_ENCRYPTION_KEY
	if (!raw) throw new Error("Merchant verification encryption is not configured")
	const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64")
	if (key.length !== 32) throw new Error("MERCHANT_VERIFICATION_ENCRYPTION_KEY must decode to 32 bytes")
	return key
}

export function encryptMerchantVerificationDetails(details: Record<string, string>) {
	const iv = crypto.randomBytes(12)
	const cipher = crypto.createCipheriv(algorithm, encryptionKey(), iv)
	const ciphertext = Buffer.concat([cipher.update(JSON.stringify(details), "utf8"), cipher.final()])
	const tag = cipher.getAuthTag()
	return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function decryptMerchantVerificationDetails(value: string): Record<string, string> {
	const [version, ivValue, tagValue, ciphertextValue] = value.split(".")
	if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) throw new Error("Unsupported merchant verification data")
	const decipher = crypto.createDecipheriv(algorithm, encryptionKey(), Buffer.from(ivValue, "base64url"))
	decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
	const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8")
	const details = JSON.parse(plaintext)
	if (!details || typeof details !== "object" || Array.isArray(details)) throw new Error("Invalid merchant verification data")
	return details as Record<string, string>
}

export function hashMerchantVerificationOtp(code: string, salt: string) {
	return crypto.scryptSync(code, salt, 32).toString("hex")
}
