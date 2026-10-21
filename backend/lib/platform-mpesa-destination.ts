import type { PlatformMpesaDestination } from "@prisma/client"
import prisma from "./db"
import { PLATFORM_MPESA_BUSINESS_NAME } from "./brand"
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
	source: "DATABASE" | "ENVIRONMENT"
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
	return prisma.platformMpesaDestination.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } })
}

function environmentDestinationSummary(): PlatformMpesaDestinationSummary {
	const env = process.env.MPESA_ENV === "production" ? "production" : "sandbox"
	const accountNumber = process.env.MPESA_SHORTCODE?.replace(/\D/g, "") || ""
	const brandIsConfigured = env !== "production" || process.env.MPESA_BUSINESS_NAME === PLATFORM_MPESA_BUSINESS_NAME
	return {
		accountType: accountNumber && validAccountNumber("PAYBILL", accountNumber) ? "PAYBILL" : null,
		accountNumber,
		version: null,
		configured: Boolean(accountNumber && validAccountNumber("PAYBILL", accountNumber) && process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_PASSKEY && brandIsConfigured),
		env,
		passkeyConfigured: Boolean(process.env.MPESA_PASSKEY && brandIsConfigured),
		source: "ENVIRONMENT",
	}
}

function destinationSummary(destination: PlatformMpesaDestination): PlatformMpesaDestinationSummary {
	const env = process.env.MPESA_ENV === "production" ? "production" : "sandbox"
	const accountType = isAccountType(destination.accountType) ? destination.accountType : null
	const passkeyConfigured = destination.passkeyCiphertext
		? Boolean(decryptPasskey(destination))
		: accountType !== "PHONE" && Boolean(process.env.MPESA_PASSKEY && destination.accountNumber === process.env.MPESA_SHORTCODE)
	const brandIsConfigured = env !== "production" || process.env.MPESA_BUSINESS_NAME === PLATFORM_MPESA_BUSINESS_NAME
	const configured = accountType === "PHONE"
		? validAccountNumber("PHONE", destination.accountNumber)
		: Boolean(accountType && validAccountNumber(accountType, destination.accountNumber) && passkeyConfigured && process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && brandIsConfigured)
	return { accountType, accountNumber: destination.accountNumber, version: destination.version, configured, env, passkeyConfigured, source: "DATABASE" }
}

export async function getPlatformMpesaDestinationSummary(version?: number): Promise<PlatformMpesaDestinationSummary> {
	const destination = await getPlatformMpesaDestination(version)
	if (destination) return destinationSummary(destination)
	if (version !== undefined) {
		return { accountType: null, accountNumber: "", version: null, configured: false, env: process.env.MPESA_ENV === "production" ? "production" : "sandbox", passkeyConfigured: false, source: "DATABASE" }
	}
	const activeDestination = await prisma.platformMpesaDestination.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } })
	if (activeDestination) return destinationSummary(activeDestination)
	if (await prisma.platformMpesaDestination.findFirst({ where: { accountType: "PAYBILL" }, select: { id: true } })) return { accountType: null, accountNumber: "", version: null, configured: false, env: process.env.MPESA_ENV === "production" ? "production" : "sandbox", passkeyConfigured: false, source: "DATABASE" }
	return environmentDestinationSummary()
}

export async function getPlatformMpesaDestinationSummaries(): Promise<PlatformMpesaDestinationSummary[]> {
	const destinations = await prisma.platformMpesaDestination.findMany({ where: { isActive: true }, orderBy: [{ accountType: "asc" }, { version: "desc" }] })
	const summaries = destinations.map(destinationSummary)
	const hasDatabasePaybill = Boolean(await prisma.platformMpesaDestination.findFirst({ where: { accountType: "PAYBILL" }, select: { id: true } }))
	if (hasDatabasePaybill) return summaries
	const fallback = environmentDestinationSummary()
	return fallback.accountType ? [fallback, ...summaries] : summaries
}

export async function getActivePlatformMpesaPaymentDestination(accountType: PlatformMpesaAccountType, version?: number | null): Promise<PlatformMpesaDestinationSummary | null> {
	if (version === undefined) {
		const destination = await prisma.platformMpesaDestination.findFirst({ where: { accountType, isActive: true }, orderBy: { version: "desc" } })
		if (destination) {
			const summary = destinationSummary(destination)
			return summary.configured ? summary : null
		}
		if (await prisma.platformMpesaDestination.findFirst({ where: { accountType }, select: { id: true } })) return null
		const fallback = environmentDestinationSummary()
		return fallback.accountType === accountType && fallback.configured ? fallback : null
	}
	if (version === null) {
		if (accountType !== "PAYBILL" || await prisma.platformMpesaDestination.findFirst({ where: { accountType }, select: { id: true } })) return null
		const fallback = environmentDestinationSummary()
		return fallback.accountType === accountType && fallback.configured ? fallback : null
	}
	const destination = await prisma.platformMpesaDestination.findUnique({ where: { version } })
	if (!destination?.isActive || destination.accountType !== accountType) return null
	const summary = destinationSummary(destination)
	return summary.configured ? summary : null
}

export async function getPlatformMpesaCredentials(version?: number): Promise<{ credentials: DarajaCredentials | null; version: number | null }> {
	const destination = await getPlatformMpesaDestination(version)
	const consumerKey = process.env.MPESA_CONSUMER_KEY
	const consumerSecret = process.env.MPESA_CONSUMER_SECRET
	if (!destination) {
		const shortcode = process.env.MPESA_SHORTCODE
		const passkey = process.env.MPESA_PASSKEY
		if (!consumerKey || !consumerSecret || !passkey || !shortcode) return { credentials: null, version: null }
		if (process.env.MPESA_ENV === "production" && process.env.MPESA_BUSINESS_NAME !== PLATFORM_MPESA_BUSINESS_NAME) return { credentials: null, version: null }
		return { credentials: { consumerKey, consumerSecret, passkey, shortcode, accountType: "PAYBILL" }, version: null }
	}
	if (!isAccountType(destination.accountType) || destination.accountType === "PHONE" || !consumerKey || !consumerSecret) return { credentials: null, version: destination.version }
	const passkey = destination.passkeyCiphertext
		? decryptPasskey(destination) || undefined
		: destination.accountNumber === process.env.MPESA_SHORTCODE ? process.env.MPESA_PASSKEY : undefined
	if (!passkey) return { credentials: null, version: destination.version }
	if (process.env.MPESA_ENV === "production" && process.env.MPESA_BUSINESS_NAME !== PLATFORM_MPESA_BUSINESS_NAME) return { credentials: null, version: destination.version }
	return { credentials: { consumerKey, consumerSecret, passkey, shortcode: destination.accountNumber, accountType: destination.accountType }, version: destination.version }
}

export function getPlatformMpesaEnvironmentCredentials(): DarajaCredentials | null {
	const consumerKey = process.env.MPESA_CONSUMER_KEY
	const consumerSecret = process.env.MPESA_CONSUMER_SECRET
	const passkey = process.env.MPESA_PASSKEY
	const shortcode = process.env.MPESA_SHORTCODE
	if (!consumerKey || !consumerSecret || !passkey || !shortcode) return null
	if (process.env.MPESA_ENV === "production" && process.env.MPESA_BUSINESS_NAME !== PLATFORM_MPESA_BUSINESS_NAME) return null
	return { consumerKey, consumerSecret, passkey, shortcode, accountType: "PAYBILL" }
}

export async function getPlatformMpesaCredentialsForDestination(destination: PlatformMpesaDestinationSummary): Promise<{ credentials: DarajaCredentials | null; version: number | null }> {
	if (destination.source === "DATABASE" && destination.version !== null) return getPlatformMpesaCredentials(destination.version)
	if (destination.source !== "ENVIRONMENT" || destination.accountType !== "PAYBILL") return { credentials: null, version: null }
	return { credentials: getPlatformMpesaEnvironmentCredentials(), version: null }
}

export function validatePlatformMpesaDestination(accountType: PlatformMpesaAccountType, accountNumber: string) {
	return validAccountNumber(accountType, accountNumber)
}
