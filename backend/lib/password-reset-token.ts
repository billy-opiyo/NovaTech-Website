import crypto from "crypto"

function passwordResetKey() {
	return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "development-only-password-reset-key"
}

export function hashPasswordResetToken(token: string) {
	return crypto.createHmac("sha256", passwordResetKey()).update(token).digest("hex")
}

export function passwordResetIdentifier(email: string) {
	return `password-reset:${email}`
}

export function emailFromPasswordResetIdentifier(identifier: string) {
	const prefix = "password-reset:"
	return identifier.startsWith(prefix) ? identifier.slice(prefix.length) : null
}
