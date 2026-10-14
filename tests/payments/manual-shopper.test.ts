import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { encryptMerchantPaymentDetails } from "../../backend/lib/merchant-verification-secrets"
import { createManualShopperPayment } from "../../backend/payments/manual-shopper"
import { mockPrismaMethod } from "../tenant/mock-prisma-method"

test("concurrent manual phone-transfer retries reserve only one pending payment per order", async () => {
	const previousKey = process.env.MERCHANT_VERIFICATION_ENCRYPTION_KEY
	const previousMode = process.env.MERCHANT_ONBOARDING_MODE
	process.env.MERCHANT_VERIFICATION_ENCRYPTION_KEY = "a".repeat(64)
	process.env.MERCHANT_ONBOARDING_MODE = "LIGHT"
	const credentialsCiphertext = encryptMerchantPaymentDetails({ paymentMode: "MANUAL_PHONE_TRANSFER" })
	const restoreTenant = mockPrismaMethod(prisma.tenant, "findUnique", async () => ({
		verificationStatus: "PENDING_REVIEW",
		verificationProfile: null,
		store: { slug: "manual-payment-test-store" },
		shopperPaymentProfile: { accountType: "PHONE", shortcode: "0712345678", accountName: "Test Merchant", status: "ACTIVE", verifiedAt: new Date(), credentialsCiphertext },
	}))
	const payments: Array<Record<string, unknown>> = []
	let sequence = 0
	let lockTail = Promise.resolve()
	const transaction = {
		$executeRaw: async () => undefined,
		order: { findFirst: async () => ({ id: "order-1", total: 1250, status: "PENDING", paymentMethod: "MPESA" }) },
		payment: {
			findFirst: async () => payments.find((payment) => payment.status === "PENDING" || payment.status === "PROCESSING") || null,
			create: async ({ data }: { data: Record<string, unknown> }) => {
				const payment = { ...data, id: `payment-${++sequence}`, currency: "KES" }
				payments.push(payment)
				return payment
			},
		},
	}
	const client = prisma as unknown as { $transaction: (callback: (tx: typeof transaction) => Promise<unknown>) => Promise<unknown> }
	const originalTransaction = client.$transaction
	client.$transaction = async (callback) => {
		let release: (() => void) | undefined
		const previous = lockTail
		lockTail = new Promise<void>((resolve) => { release = resolve })
		let locked = false
		const tx = {
			...transaction,
			$executeRaw: async () => {
				await previous
				locked = true
			},
		}
		try { return await callback(tx) } finally { if (locked) release?.(); else release?.() }
	}
	try {
		const results = await Promise.all([
			createManualShopperPayment({ tenantId: "tenant-1", orderId: "order-1", phone: "0712345678" }),
			createManualShopperPayment({ tenantId: "tenant-1", orderId: "order-1", phone: "0712345678" }),
		])
		assert.equal(payments.length, 1)
		assert.equal(results[0].paymentId, results[1].paymentId)
	} finally {
		client.$transaction = originalTransaction
		restoreTenant()
		if (previousKey === undefined) delete process.env.MERCHANT_VERIFICATION_ENCRYPTION_KEY
		else process.env.MERCHANT_VERIFICATION_ENCRYPTION_KEY = previousKey
		if (previousMode === undefined) delete process.env.MERCHANT_ONBOARDING_MODE
		else process.env.MERCHANT_ONBOARDING_MODE = previousMode
	}
})
