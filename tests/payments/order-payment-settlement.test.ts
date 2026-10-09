import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { finalizePendingOrderPayment } from "../../backend/services/order.service"

function mockTransaction(orderStatus: string, cancellationWinsBeforeClaim = false) {
	let currentStatus = orderStatus
	let orderReads = 0
	let savedPayment: Record<string, unknown> | null = null
	const tx = {
		payment: {
			findFirst: async () => ({ id: "payment-1", metadata: { prior: true } }),
			update: async ({ data }: { data: Record<string, unknown> }) => (savedPayment = { id: "payment-1", ...data }),
		},
		order: {
			findFirst: async () => {
				orderReads += 1
				return currentStatus === "CONFIRMED" ? { id: "order-1", status: currentStatus, items: [] } : { id: "order-1", status: currentStatus }
			},
			updateMany: async () => {
				if (cancellationWinsBeforeClaim && orderReads === 1) {
					currentStatus = "CANCELLED"
					return { count: 0 }
				}
				if (currentStatus !== "PENDING") return { count: 0 }
				currentStatus = "CONFIRMED"
				return { count: 1 }
			},
		},
	}
	return { tx, get status() { return currentStatus }, get payment() { return savedPayment } }
}

async function withTransactionMock<T>(mock: ReturnType<typeof mockTransaction>, run: () => Promise<T>) {
	const client = prisma as unknown as { $transaction: (callback: (tx: typeof mock.tx) => Promise<T>) => Promise<T> }
	const original = client.$transaction
	client.$transaction = (callback) => callback(mock.tx)
	try { return await run() } finally { client.$transaction = original }
}

test("successful provider settlement atomically confirms pending order and records payment", async () => {
	const mock = mockTransaction("PENDING")
	const result = await withTransactionMock(mock, () => finalizePendingOrderPayment({ paymentId: "payment-1", orderId: "order-1", tenantId: "tenant-1", metadata: { providerStatus: "succeeded" } }))
	assert.equal(mock.status, "CONFIRMED")
	assert.equal(result.payment.status, "COMPLETED")
	assert.equal(result.order?.status, "CONFIRMED")
	assert.equal(result.refundRequired, false)
	assert.equal(result.reviewRequired, false)
})

test("payment arriving after cancellation is recorded and explicitly marked for refund review", async () => {
	const mock = mockTransaction("CANCELLED")
	const result = await withTransactionMock(mock, () => finalizePendingOrderPayment({ paymentId: "payment-1", orderId: "order-1", tenantId: "tenant-1" }))
	assert.equal(mock.status, "CANCELLED")
	assert.equal(result.payment.status, "COMPLETED")
	assert.equal(result.order, null)
	assert.equal(result.refundRequired, true)
	assert.equal(result.reviewRequired, false)
	assert.equal((result.payment.metadata as Record<string, unknown>).orderSettlement, "REFUND_REQUIRED_ORDER_CANCELLED")
})

test("settlement re-reads order state when cancellation wins between its initial read and claim", async () => {
	const mock = mockTransaction("PENDING", true)
	const result = await withTransactionMock(mock, () => finalizePendingOrderPayment({ paymentId: "payment-1", orderId: "order-1", tenantId: "tenant-1" }))
	assert.equal(mock.status, "CANCELLED")
	assert.equal(result.payment.status, "COMPLETED")
	assert.equal(result.order, null)
	assert.equal(result.refundRequired, true)
	assert.equal(result.reviewRequired, false)
	assert.equal((result.payment.metadata as Record<string, unknown>).orderSettlement, "REFUND_REQUIRED_ORDER_CANCELLED")
})
