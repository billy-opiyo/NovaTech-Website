import type { PlatformMpesaDestination } from "@prisma/client"
import prisma from "./db"
import { PLATFORM_BRAND_NAME } from "./brand"
import { decryptMerchantPaymentDetails } from "./merchant-verification-secrets"
import type { DarajaCredentials } from "./daraja"

export type PlatformMpesaAccountType = "PAYBILL" | "TILL" | "PHONE"

export type PlatformMpesaDestinationSummary = {
	accountType: PlatformMpesaAccountType | null
	accountNumber: string
	version: number | null
	configured: boolean
	env: "production" | "sandbox"
	passkeyConfigured: boolean
}

function isAccountType(value: string): value is PlatformMpesaAccountType {
	return value === "PAYBILL" || value === "TILL" || value === "PHONE"
}

function validAccountNumber(accountType: PlatformMpesaAccountType, value: string) {
	const digits = value.replace(/\D/g, "")
	return accountType === "PHONE" ? /^(254[17]\d{8}|0[17]\d{8})$/.test(digits) : /^\d{5,10}$/.test(digits)
}

function decryptPasskey(destination: PlatformMpesaDestination) {
	if (!destination.passkeyCiphertext) return null
	try {
		return decryptMerchantPaymentDetails(destination.passkeyCiphertext).passkey || null
	} catch {
		return null
	}
}

export async function getPlatformMpesaDestination(version?: number): Promise<PlatformMpesaDestination | null> {
	if (version !== undefined) return prisma.platformMpesaDestination.findUnique({ where: { version } })
	return prisma.platformMpesaDestination.findFirst({ orderBy: { version: "desc" } })
}

export async function getPlatformMpesaDestinationSummary(): Promise<PlatformMpesaDestinationSummary> {
	const destination = await getPlatformMpesaDestination()
	const env = process.env.MPESA_ENV === "production" ? "production" : "sandbox"
	if (!destination) {
		const accountNumber = process.env.MPESA_SHORTCODE?.replace(/\D/g, "") || ""
		const brandIsConfigured = env !== "production" || process.env.MPESA_BUSINESS_NAME === PLATFORM_BRAND_NAME
		return {
			accountType: accountNumber && validAccountNumber("PAYBILL", accountNumber) ? "PAYBILL" : null,
			accountNumber,
			version: null,
			configured: Boolean(accountNumber && validAccountNumber("PAYBILL", accountNumber) && process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_PASSKEY && brandIsConfigured),
			env,
			passkeyConfigured: Boolean(process.env.MPESA_PASSKEY && brandIsConfigured),
		}
	}
	const accountType = isAccountType(destination.accountType) ? destination.accountType : null
	const passkeyConfigured = destination.passkeyCiphertext
		? Boolean(decryptPasskey(destination))
		: accountType !== "PHONE" && Boolean(process.env.MPESA_PASSKEY && destination.accountNumber === process.env.MPESA_SHORTCODE)
	const brandIsConfigured = env !== "production" || process.env.MPESA_BUSINESS_NAME === PLATFORM_BRAND_NAME
	const configured = accountType === "PHONE"
		? validAccountNumber("PHONE", destination.accountNumber)
		: Boolean(accountType && validAccountNumber(accountType, destination.accountNumber) && passkeyConfigured && process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && brandIsConfigured)
	return { accountType, accountNumber: destination.accountNumber, version: destination.version, configured, env, passkeyConfigured }
}

export async function getPlatformMpesaCredentials(version?: number): Promise<{ credentials: DarajaCredentials | null; version: number | null }> {
	const destination = await getPlatformMpesaDestination(version)
	const consumerKey = process.env.MPESA_CONSUMER_KEY
	const consumerSecret = process.env.MPESA_CONSUMER_SECRET
	if (!destination) {
		const shortcode = process.env.MPESA_SHORTCODE
		const passkey = process.env.MPESA_PASSKEY
		if (!consumerKey || !consumerSecret || !passkey || !shortcode) return { credentials: null, version: null }
		if (process.env.MPESA_ENV === "production" && process.env.MPESA_BUSINESS_NAME !== PLATFORM_BRAND_NAME) return { credentials: null, version: null }
		return { credentials: { consumerKey, consumerSecret, passkey, shortcode, accountType: "PAYBILL" }, version: null }
	}
	if (!isAccountType(destination.accountType) || destination.accountType === "PHONE" || !consumerKey || !consumerSecret) return { credentials: null, version: destination.version }
	const passkey = destination.passkeyCiphertext
		? decryptPasskey(destination) || undefined
		: destination.accountNumber === process.env.MPESA_SHORTCODE ? process.env.MPESA_PASSKEY : undefined
	if (!passkey) return { credentials: null, version: destination.version }
	if (process.env.MPESA_ENV === "production" && process.env.MPESA_BUSINESS_NAME !== PLATFORM_BRAND_NAME) return { credentials: null, version: destination.version }
	return { credentials: { consumerKey, consumerSecret, passkey, shortcode: destination.accountNumber, accountType: destination.accountType }, version: destination.version }
}

export function validatePlatformMpesaDestination(accountType: PlatformMpesaAccountType, accountNumber: string) {
	return validAccountNumber(accountType, accountNumber)
}
