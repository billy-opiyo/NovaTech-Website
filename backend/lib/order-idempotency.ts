import { createHash } from "node:crypto"

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize)
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, canonicalize(entry)]),
		)
	}
	return value
}

/**
 * Scopes retries to one tenant, shopper, client key, and complete checkout.
 * Only the resulting digest is persisted; checkout PII is never put in the key.
 */
export function createOrderIdempotencyKey(input: {
	tenantId: string
	ownerScope: string
	clientKey: string
	checkout: unknown
}) {
	const canonicalInput = JSON.stringify([
		input.tenantId,
		input.ownerScope,
		input.clientKey.trim(),
		canonicalize(input.checkout),
	])
	return createHash("sha256").update(canonicalInput).digest("hex")
}
