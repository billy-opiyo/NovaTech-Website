import prisma from "../lib/db"
import { decryptMerchantPaymentDetails } from "../lib/merchant-verification-secrets"
import { isMpesaConfigured } from "../lib/daraja"
import type { DarajaCredentials } from "../lib/daraja"
import { isStripeConfigured } from "../lib/stripeClient"

export async function getPlatformStorePaymentConfiguration() {
	return prisma.platformStorePaymentConfiguration.findUnique({ where: { id: "platform-store" } })
}

export async function getActivePlatformStorePaymentRoute() {
	const configuration = await getPlatformStorePaymentConfiguration()
	if (!configuration?.enabled || !configuration.authorizedAt) return null
	if (configuration.provider === "STRIPE") return isStripeConfigured() ? { provider: "STRIPE" as const } : null
	if (configuration.provider !== "MPESA" || !configuration.accountType || !configuration.accountNumber) return null
	if (configuration.accountType === "PHONE") return { provider: "MPESA" as const, manualTransfer: { phone: configuration.accountNumber, accountName: configuration.accountName || "" } }
	if (!configuration.credentialsCiphertext) return null
	try {
		const credentials = decryptMerchantPaymentDetails(configuration.credentialsCiphertext)
		const route: DarajaCredentials = {
			consumerKey: credentials.consumerKey || "",
			consumerSecret: credentials.consumerSecret || "",
			passkey: credentials.passkey || "",
			shortcode: configuration.accountNumber,
			accountType: configuration.accountType === "TILL" ? "TILL" : "PAYBILL",
		}
		return isMpesaConfigured(route) ? { provider: "MPESA" as const, credentials: route } : null
	} catch {
		return null
	}
}

export async function getPlatformStorePaymentSummary() {
	const configuration = await getPlatformStorePaymentConfiguration()
	const activeRoute = await getActivePlatformStorePaymentRoute()
	return {
		provider: configuration?.provider || null,
		accountType: configuration?.accountType || null,
		accountNumber: configuration?.accountNumber || null,
		accountName: configuration?.accountName || null,
		enabled: Boolean(activeRoute),
		authorizedAt: configuration?.authorizedAt || null,
		credentialsConfigured: Boolean(configuration?.credentialsCiphertext),
		manualPhone: configuration?.provider === "MPESA" && configuration.accountType === "PHONE" ? configuration.accountNumber : null,
	}
}
