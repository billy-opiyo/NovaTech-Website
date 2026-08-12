import crypto from "crypto"

const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"

let cachedToken: { token: string; expiresAt: number } | null = null

function getBaseUrl(): string {
	return process.env.MPESA_ENV === "production"
		? PRODUCTION_BASE_URL
		: SANDBOX_BASE_URL
}

export function isMpesaConfigured(): boolean {
	return Boolean(
		process.env.MPESA_CONSUMER_KEY &&
			process.env.MPESA_CONSUMER_SECRET &&
			process.env.MPESA_PASSKEY &&
			process.env.MPESA_SHORTCODE,
	)
}

export function normalizePhone(phone: string): string {
	const cleaned = phone.replace(/\D/g, "")
	if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned
	if (cleaned.startsWith("0") && cleaned.length === 10)
		return `254${cleaned.slice(1)}`
	if (
		(cleaned.startsWith("7") || cleaned.startsWith("1")) &&
		cleaned.length === 9
	)
		return `254${cleaned}`
	throw new Error("Invalid Kenyan phone number format")
}

export function generatePassword(
	shortcode: string,
	passkey: string,
): { password: string; timestamp: string } {
	const timestamp = new Date()
		.toISOString()
		.replace(/[-:T.Z]/g, "")
		.slice(0, 14)
	const raw = `${shortcode}${passkey}${timestamp}`
	return {
		password: Buffer.from(raw).toString("base64"),
		timestamp,
	}
}

async function getAccessToken(): Promise<string> {
	if (cachedToken && cachedToken.expiresAt > Date.now()) {
		return cachedToken.token
	}

	const consumerKey = process.env.MPESA_CONSUMER_KEY
	const consumerSecret = process.env.MPESA_CONSUMER_SECRET
	if (!consumerKey || !consumerSecret) {
		throw new Error("M-Pesa consumer key/secret not configured")
	}

	const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
		"base64",
	)

	const res = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
		headers: { Authorization: `Basic ${auth}` },
	})

	if (!res.ok) {
		throw new Error(`M-Pesa OAuth failed: ${res.status} ${await res.text()}`)
	}

	const data = (await res.json()) as { access_token: string; expires_in: number }
	cachedToken = {
		token: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 60) * 1000,
	}
	return data.access_token
}

interface DarajaRequestOptions {
	path: string
	body: Record<string, unknown>
}

async function darajaRequest({ path, body }: DarajaRequestOptions) {
	const token = await getAccessToken()
	const res = await fetch(`${getBaseUrl()}${path}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	})

	if (!res.ok) {
		throw new Error(`Daraja API error: ${res.status} ${await res.text()}`)
	}

	return res.json()
}

export interface StkPushParams {
	amount: number
	phone: string
	accountReference: string
	transactionDesc?: string
	callbackUrl: string
}

export async function stkPush({
	amount,
	phone,
	accountReference,
	transactionDesc = "NovaTech Store Payment",
	callbackUrl,
}: StkPushParams) {
	const shortcode = process.env.MPESA_SHORTCODE
	const passkey = process.env.MPESA_PASSKEY
	if (!shortcode || !passkey) {
		throw new Error("M-Pesa shortcode/passkey not configured")
	}

	const { password, timestamp } = generatePassword(shortcode, passkey)
	const normalizedPhone = normalizePhone(phone)

	return darajaRequest({
		path: "/mpesa/stkpush/v1/processrequest",
		body: {
			BusinessShortCode: shortcode,
			Password: password,
			Timestamp: timestamp,
			TransactionType: "CustomerPayBillOnline",
			Amount: Math.round(amount),
			PartyA: normalizedPhone,
			PartyB: shortcode,
			PhoneNumber: normalizedPhone,
			CallBackURL: callbackUrl,
			AccountReference: accountReference,
			TransactionDesc: transactionDesc,
		},
	})
}

export interface StkQueryParams {
	checkoutRequestId: string
}

export async function stkQuery({ checkoutRequestId }: StkQueryParams) {
	const shortcode = process.env.MPESA_SHORTCODE
	const passkey = process.env.MPESA_PASSKEY
	if (!shortcode || !passkey) {
		throw new Error("M-Pesa shortcode/passkey not configured")
	}

	const { password, timestamp } = generatePassword(shortcode, passkey)

	return darajaRequest({
		path: "/mpesa/stkpushquery/v1/query",
		body: {
			BusinessShortCode: shortcode,
			Password: password,
			Timestamp: timestamp,
			CheckoutRequestID: checkoutRequestId,
		},
	})
}

export interface C2BSimulateParams {
	amount: number
	phone: string
	accountReference: string
}

export async function c2bSimulate({
	amount,
	phone,
	accountReference,
}: C2BSimulateParams) {
	const shortcode = process.env.MPESA_SHORTCODE
	if (!shortcode) {
		throw new Error("M-Pesa shortcode not configured")
	}

	return darajaRequest({
		path: "/mpesa/c2b/v1/simulate",
		body: {
			ShortCode: shortcode,
			CommandID: "CustomerPayBillOnline",
			Amount: Math.round(amount),
			Msisdn: normalizePhone(phone),
			BillRefNumber: accountReference,
		},
	})
}

export function verifyStkCallbackPassword(
	shortcode: string,
	passkey: string,
	timestamp: string,
	password: string,
): boolean {
	const expected = Buffer.from(
		`${shortcode}${passkey}${timestamp}`,
	).toString("base64")
	const expectedBuffer = Buffer.from(expected)
	const providedBuffer = Buffer.from(password)
	// timingSafeEqual throws when buffer lengths differ; malformed provider
	// input should simply fail verification instead of crashing the webhook.
	if (expectedBuffer.length !== providedBuffer.length) return false
	return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}
