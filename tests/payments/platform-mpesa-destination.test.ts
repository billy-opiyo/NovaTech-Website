import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { encryptMerchantPaymentDetails } from "../../backend/lib/merchant-verification-secrets"
import { getPlatformMpesaCredentials, getPlatformMpesaDestinationSummary, validatePlatformMpesaDestination } from "../../backend/lib/platform-mpesa-destination"
import { submitManualBillingReceipt } from "../../backend/billing/service"
import { mockPrismaMethod } from "../tenant/mock-prisma-method"

function withEnvironment(values: Record<string, string>, run: () => Promise<void>) {
	const previous = new Map<string, string | undefined>()
	for (const [key, value] of Object.entries(values)) {
		previous.set(key, process.env[key])
		process.env[key] = value
	}
	return run().finally(() => {
		for (const [key, value] of previous) {
			if (value === undefined) delete process.env[key]
			else process.env[key] = value
		}
	})
}

test("platform M-Pesa destination validates short codes and Kenyan phone numbers by selected type", () => {
	assert.equal(validatePlatformMpesaDestination("PAYBILL", "123456"), true)
	assert.equal(validatePlatformMpesaDestination("TILL", "123456"), true)
	assert.equal(validatePlatformMpesaDestination("PHONE", "0712345678"), true)
	assert.equal(validatePlatformMpesaDestination("PHONE", "+254712345678"), true)
	assert.equal(validatePlatformMpesaDestination("PHONE", "123456"), false)
	assert.equal(validatePlatformMpesaDestination("TILL", "123"), false)
})

test("versioned Till credentials decrypt only on the server and preserve their shortcode and transaction type", async () => {
	await withEnvironment({ MERCHANT_VERIFICATION_ENCRYPTION_KEY: "a".repeat(64), MPESA_CONSUMER_KEY: "consumer-key", MPESA_CONSUMER_SECRET: "consumer-secret", MPESA_ENV: "sandbox" }, async () => {
		const passkeyCiphertext = encryptMerchantPaymentDetails({ passkey: "till-passkey" })
		const row = { id: "destination-7", version: 7, accountType: "TILL", accountNumber: "123456", passkeyCiphertext, createdById: "admin-a", createdAt: new Date() }
		const restore = mockPrismaMethod(prisma.platformMpesaDestination, "findUnique", async () => row)
		try {
			const result = await getPlatformMpesaCredentials(7)
			assert.equal(result.version, 7)
			assert.deepEqual(result.credentials, { consumerKey: "consumer-key", consumerSecret: "consumer-secret", passkey: "till-passkey", shortcode: "123456", accountType: "TILL" })
		} finally { restore() }
	})
})

test("phone destination remains manual and does not produce Daraja credentials", async () => {
	const row = { id: "destination-phone", version: 8, accountType: "PHONE", accountNumber: "254712345678", passkeyCiphertext: null, createdById: "admin-a", createdAt: new Date() }
	const restore = mockPrismaMethod(prisma.platformMpesaDestination, "findUnique", async () => row)
	try {
		const result = await getPlatformMpesaCredentials(8)
		assert.deepEqual(result, { credentials: null, version: 8 })
	} finally { restore() }
})

test("manual receipt submission only queues a phone-destination billing payment for review", async () => {
	const payment = { id: "payment-a", tenantId: "tenant-a", provider: "mpesa-manual", kind: "SETUP_FEE", status: "PENDING", providerReference: null, metadata: { platformPaymentDestination: { accountType: "PHONE", accountNumber: "254712345678", version: 3 } } }
	let updated: unknown
	const restoreFind = mockPrismaMethod(prisma.payment, "findFirst", async () => payment)
	const restoreReceipt = mockPrismaMethod(prisma.payment, "findUnique", async () => null)
	const restoreUpdate = mockPrismaMethod(prisma.payment, "updateMany", async (args: unknown) => { updated = args; return { count: 1 } })
	try {
		const result = await submitManualBillingReceipt({ tenantId: "tenant-a", paymentId: "payment-a", receiptCode: "abc1234567" })
		assert.equal(result.status, "PROCESSING")
		assert.match(result.message, /verify/i)
		assert.deepEqual(updated, {
			where: { id: "payment-a", tenantId: "tenant-a", provider: "mpesa-manual", status: "PENDING", providerReference: null },
			data: { providerReference: "ABC1234567", status: "PROCESSING", metadata: { platformPaymentDestination: payment.metadata.platformPaymentDestination, manualReceiptCode: "ABC1234567", manualReceiptSubmittedAt: (updated as { data: { metadata: { manualReceiptSubmittedAt: string } } }).data.metadata.manualReceiptSubmittedAt } },
		})
	} finally {
		restoreFind()
		restoreReceipt()
		restoreUpdate()
	}
})
