export const NURAVA_VAT_RATE = 16
export const NURAVA_VAT_INCLUSIVE = true
export const TENANT_WORKSPACE_RETENTION_DAYS = 90
export const SHOPPER_ENQUIRY_RETENTION_DAYS = 365
export const VERIFICATION_EVIDENCE_RETENTION_DAYS = 90
export const BILLING_LEGAL_RETENTION_DAYS = 7 * 365

const dayMilliseconds = 24 * 60 * 60 * 1000

export function configuredSaasVatRate() {
	if (process.env.NURAVA_VAT_ENABLED?.toLowerCase() !== "true") return 0
	const rate = Number(process.env.NURAVA_VAT_RATE || NURAVA_VAT_RATE)
	if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error("NURAVA_VAT_RATE must be between 0 and 100")
	return rate
}

export function calculateInclusiveVat(grossAmount: number, rate: number) {
	if (!Number.isFinite(grossAmount) || grossAmount < 0) throw new Error("Gross amount must be a non-negative number")
	if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error("VAT rate must be between 0 and 100")
	const taxAmount = rate === 0 ? 0 : Math.round(grossAmount * rate / (100 + rate))
	return { grossAmount, netAmount: grossAmount - taxAmount, taxAmount }
}

export function calculateSaasInvoiceTotals(input: { subscription: number; addons?: number; setupFee?: number; vatRate?: number }) {
	const grossTotal = Math.max(0, input.subscription) + Math.max(0, input.addons || 0) + Math.max(0, input.setupFee || 0)
	const breakdown = calculateInclusiveVat(grossTotal, input.vatRate ?? 0)
	return { ...breakdown, vatRate: input.vatRate ?? 0 }
}

export function retentionDueAt(startsAt: Date, retentionDays: number) {
	return new Date(startsAt.getTime() + retentionDays * dayMilliseconds)
}

export function subscriptionRefundPolicy() {
	return {
		routineRefund: false,
		accessContinuesUntilPaidPeriodEnds: true,
		exceptions: ["DUPLICATE_PAYMENT", "BILLING_ERROR", "LEGAL_REQUIREMENT"] as const,
	}
}

export function setupFeeRefundPolicy(setupStarted: boolean, providerUnableToProvision: boolean) {
	return !setupStarted && providerUnableToProvision
}
