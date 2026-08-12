export function sanitizeEmail(value: string): string {
	return value.trim().toLowerCase()
}

export function maskSecret(value?: string): string {
	if (!value) return ""
	if (value.length <= 4) return "****"
	return `${value.slice(0, 2)}${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-2)}`
}

export function isStrongPassword(password: string): boolean {
	return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)
}

export function sanitizeObject<T extends Record<string, unknown>>(input: T): T {
	const sanitized: Record<string, unknown> = { ...input }

	for (const [key, value] of Object.entries(sanitized)) {
		if (typeof value === "string") {
			sanitized[key] = value.trim()
		}
	}

	return sanitized as T
}
