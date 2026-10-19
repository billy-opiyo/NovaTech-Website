import { SmsDeliveryError } from "./types"

/** Normalize Kenyan national inputs and preserve international E.164 numbers. */
export function normalizeSmsPhoneNumber(input: string): string {
	const value = input.trim()
	if (!value || !/^[+\d\s().-]+$/.test(value)) {
		throw new SmsDeliveryError("INVALID_PHONE_NUMBER", 400)
	}

	const digits = value.replace(/\D/g, "")
	let normalized: string

	if (value.startsWith("+")) {
		normalized = `+${digits}`
	} else if (value.startsWith("00")) {
		normalized = `+${digits.slice(2)}`
	} else if (digits.startsWith("254") && digits.length === 12) {
		normalized = `+${digits}`
	} else if (digits.startsWith("0") && digits.length === 10) {
		normalized = `+254${digits.slice(1)}`
	} else if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) {
		normalized = `+254${digits}`
	} else if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0")) {
		// Digit-only international numbers retain their country code; just add the E.164 prefix.
		normalized = `+${digits}`
	} else {
		throw new SmsDeliveryError("INVALID_PHONE_NUMBER", 400)
	}

	if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
		throw new SmsDeliveryError("INVALID_PHONE_NUMBER", 400)
	}
	return normalized
}
