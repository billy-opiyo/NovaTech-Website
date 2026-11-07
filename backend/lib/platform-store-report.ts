export type PlatformStoreFinancialInputs = {
	completedPaymentAmounts: number[]
	completedRefundAmounts: number[]
	fulfilledItems: { quantity: number; supplierCost: number; deliveryCost: number }[]
}

export function summarizePlatformStoreFinancials(input: PlatformStoreFinancialInputs) {
	const paidRevenue = input.completedPaymentAmounts.reduce((total, amount) => total + amount, 0)
	const refundedAmount = input.completedRefundAmounts.reduce((total, amount) => total + amount, 0)
	const supplierCost = input.fulfilledItems.reduce((total, item) => total + item.supplierCost * item.quantity, 0)
	const supplierDeliveryCost = input.fulfilledItems.reduce((total, item) => total + item.deliveryCost, 0)
	return {
		paidRevenue,
		refundedAmount,
		netRevenueAfterRefunds: paidRevenue - refundedAmount,
		supplierCost,
		supplierDeliveryCost,
		grossMarginAfterRecordedSupplierCosts: paidRevenue - refundedAmount - supplierCost - supplierDeliveryCost,
	}
}
