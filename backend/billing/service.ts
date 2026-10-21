import type Stripe from "stripe"
import { BillingPaymentKind, BillingRecordStatus, InvoiceKind, InvoiceStatus, Prisma, SubscriptionStatus } from "@prisma/client"
import prisma from "../lib/db"
import { retentionDueAt } from "../retention/tenant-retention"
import { getStripeClient, isStripeConfigured } from "../lib/stripeClient"
import { initiateMpesaPayment } from "../payments/mpesa"
import { isShopperCheckoutEnabled } from "../lib/commerce-model"
import { calculateSaasInvoiceTotals, configuredSaasVatRate } from "./policy"
import { pilotTrialEndsAt } from "./mvp-policy"
import { finalizeInvoiceCredits, releaseInvoiceCredits, reserveBillingCredits } from "./credits"
import { isMerchantVerificationRequired } from "../lib/merchant-verification"
import { getActivePlatformMpesaPaymentDestination, getPlatformMpesaCredentialsForDestination, getPlatformMpesaDestinationSummary, type PlatformMpesaAccountType, type PlatformMpesaDestinationSummary } from "../lib/platform-mpesa-destination"
import { normalizePhone } from "../lib/daraja"

export class BillingError extends Error {
	status: number
	code: string

	constructor(message: string, status = 400, code = "BILLING_ERROR") {
		super(message)
		this.name = "BillingError"
		this.status = status
		this.code = code
	}
}

const paidSubscriptionStatuses = ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE_PERIOD"] as const
const billableSubscriptionStatuses = [...paidSubscriptionStatuses, "SUSPENDED"] as const
const saasBillingProvider = (process.env.NURAVA_SAAS_BILLING_PROVIDER || "mpesa").toLowerCase()

function paymentUsesDestination(payment: { metadata: unknown }, destination: PlatformMpesaDestinationSummary) {
	const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata as Record<string, unknown> : {}
	const saved = metadata.platformPaymentDestination && typeof metadata.platformPaymentDestination === "object" ? metadata.platformPaymentDestination as Record<string, unknown> : {}
	return saved.accountType === destination.accountType && saved.accountNumber === destination.accountNumber && (saved.version ?? null) === destination.version
}

function assertPendingPaymentDestination(payment: { status: string; metadata: unknown }, destination: PlatformMpesaDestinationSummary) {
	if (["PENDING", "PROCESSING"].includes(payment.status) && !paymentUsesDestination(payment, destination)) {
		throw new BillingError("A payment attempt is already pending with another platform payment option. Finish or wait for that attempt before choosing a different option.", 409, "BILLING_PAYMENT_DESTINATION_PENDING")
	}
}

async function selectBillingDestination(input: { destinationType?: PlatformMpesaAccountType; destinationVersion?: number | null }) {
	const destination = input.destinationType
		? await getActivePlatformMpesaPaymentDestination(input.destinationType, input.destinationVersion)
		: await getPlatformMpesaDestinationSummary()
	if (!destination?.configured || !destination.accountType) throw new BillingError("The selected platform M-Pesa payment option is not available", 409, "MPESA_DESTINATION_NOT_AVAILABLE")
	return destination
}

type StripeProviderPayload = {
	id?: string
	status?: string
	metadata?: Record<string, string>
	customer?: string
	subscription?: string
	current_period_start?: unknown
	current_period_end?: unknown
	cancel_at_period_end?: boolean
	hosted_invoice_url?: string
	invoice_pdf?: string
	subtotal?: number
	amount_due?: number
	amount_paid?: number
	currency?: string
	payment_intent?: string
}

export function isMpesaOnlySaasBilling() {
	return saasBillingProvider === "mpesa"
}

export function stripeAmount(amount: number, currency: string) {
	// Platform billing is configured and displayed in KES. Do not silently apply
	// a two-decimal conversion to currencies with different minor-unit rules.
	if (currency.toUpperCase() !== "KES") throw new BillingError("Stripe platform billing currently supports KES only", 400, "UNSUPPORTED_BILLING_CURRENCY")
	return Math.round(amount * 100)
}

export function calculateCommission(grossAmount: number, percentage: number) {
	if (!Number.isFinite(grossAmount) || grossAmount < 0) throw new BillingError("Gross amount must be a non-negative number")
	if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) throw new BillingError("Commission percentage must be between 0 and 100")
	return Math.round(grossAmount * (percentage / 100) * 100) / 100
}

function dateFromUnix(value: unknown) {
	return typeof value === "number" && value > 0 ? new Date(value * 1000) : undefined
}

function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
	if (status === "trialing") return "TRIALING"
	if (status === "active") return "ACTIVE"
	if (status === "past_due") return "PAST_DUE"
	if (status === "incomplete") return "INCOMPLETE"
	if (status === "unpaid") return "UNPAID"
	if (status === "canceled") return "CANCELLED"
	return "SUSPENDED"
}

function tenantStatusForSubscription(status: SubscriptionStatus) {
	if (status === "TRIALING") return "TRIALING" as const
	if (status === "ACTIVE") return "ACTIVE" as const
	if (status === "PAST_DUE") return "PAST_DUE" as const
	if (status === "GRACE_PERIOD") return "GRACE_PERIOD" as const
	if (status === "CANCELLED") return "CANCELLED" as const
	return "SUSPENDED" as const
}

async function restoreTenantAfterBillingPayment(tenantId: string, planId: string) {
	const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { suspensionReason: true, verificationStatus: true, store: { select: { id: true, publicationStatus: true } } } })
	if (!tenant || tenant.suspensionReason === "PLATFORM") {
		await prisma.tenant.update({ where: { id: tenantId }, data: { planId } }).catch(() => undefined)
		return
	}
	await prisma.tenant.update({ where: { id: tenantId }, data: { status: "ACTIVE", planId, ...(tenant.suspensionReason === "BILLING" ? { suspensionReason: null, suspendedAt: null } : {}) } }).catch(() => undefined)
	if (tenant.suspensionReason === "BILLING" && (!isMerchantVerificationRequired() || tenant.verificationStatus === "APPROVED") && tenant.store?.publicationStatus === "SUSPENDED") {
		await prisma.store.update({ where: { id: tenant.store.id }, data: { publicationStatus: "PUBLISHED" } }).catch(() => undefined)
	}
}

export async function listActivePlans() {
	return prisma.plan.findMany({
		where: { active: true },
		orderBy: [{ price: "asc" }, { name: "asc" }],
		select: { id: true, key: true, name: true, price: true, currency: true, billingInterval: true, setupFeeAmount: true, transactionFeePercent: true, entitlementsJson: true, stripePriceId: true },
	})
}

export async function listActiveAddons() {
	return prisma.addon.findMany({
		where: { active: true },
		orderBy: { name: "asc" },
		select: { id: true, key: true, name: true, description: true, price: true, currency: true, billingInterval: true, stripePriceId: true },
	})
}

export async function ensureBillingRecords(tenantId: string, ownerUserId?: string) {
	const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, planId: true, plan: { select: { setupFeeAmount: true, currency: true } } } })
	if (!tenant) throw new BillingError("Tenant not found", 404, "TENANT_NOT_FOUND")
	const setupFeeAmount = tenant.plan?.setupFeeAmount || 0
	const currency = tenant.plan?.currency || "KES"
	const [customer, record] = await prisma.$transaction([
		prisma.billingCustomer.upsert({ where: { tenantId }, update: ownerUserId ? { ownerUserId } : {}, create: { tenantId, ownerUserId } }),
		prisma.billingRecord.upsert({ where: { tenantId }, update: { setupFeeAmount, currency, ...(ownerUserId ? { ownerUserId } : {}) }, create: { tenantId, ownerUserId, setupFeeAmount, currency, setupFeeStatus: setupFeeAmount > 0 ? "PENDING" : "PAID", setupFeePaidAt: setupFeeAmount > 0 ? undefined : new Date() } }),
	])
	return { customer, record }
}

export async function getBillingSnapshot(tenantId: string) {
	const now = new Date()
	const tenant = await prisma.tenant.findUnique({
		where: { id: tenantId },
		include: {
			plan: true,
			billingCustomer: true,
			billingRecord: true,
			subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true, pendingPlan: true, addonSubscriptions: { include: { addon: true } } } },
			invoices: { orderBy: { createdAt: "desc" }, take: 25, include: { payments: { orderBy: { createdAt: "desc" }, take: 3 } } },
			payments: { where: { kind: { not: "ORDER" } }, orderBy: { createdAt: "desc" }, take: 25 },
			transactions: { orderBy: { createdAt: "desc" }, take: 25 },
			billingCredits: { where: { status: "AVAILABLE", remainingAmount: { gt: 0 } }, orderBy: { issuedAt: "asc" } },
		},
	})
	if (!tenant) throw new BillingError("Tenant not found", 404, "TENANT_NOT_FOUND")
	const usage = await prisma.usageCounter.findMany({ where: { tenantId, periodStart: { lte: now }, periodEnd: { gt: now } }, orderBy: { metric: "asc" }, select: { metric: true, value: true, periodStart: true, periodEnd: true } })
	const activeAddons = tenant.subscriptions[0]?.addonSubscriptions.filter((item) => ["ACTIVE", "PAST_DUE"].includes(item.status)) || []
	const pendingAddons = tenant.subscriptions[0]?.addonSubscriptions.filter((item) => item.status === "INCOMPLETE") || []
	return {
		tenant,
		subscription: tenant.subscriptions[0] || null,
		activeAddons,
		pendingAddons,
		invoices: tenant.invoices,
		payments: tenant.payments,
		usage,
	}
}

async function getPlanAndAddons(planKey: string, addonKeys: string[]) {
	const plan = await prisma.plan.findFirst({ where: { key: planKey, active: true } })
	if (!plan) throw new BillingError("The selected plan is unavailable", 404, "PLAN_NOT_FOUND")
	if (!plan.price || !plan.billingInterval) throw new BillingError("The selected plan is not configured for paid billing", 409, "PLAN_NOT_BILLABLE")
	const addons = addonKeys.length ? await prisma.addon.findMany({ where: { key: { in: addonKeys }, active: true } }) : []
	if (addons.length !== new Set(addonKeys).size) throw new BillingError("One or more selected add-ons are unavailable", 409, "ADDON_NOT_FOUND")
	return { plan, addons }
}

async function verifyStripePriceConfiguration(priceId: string | null, amount: number, currency: string, interval: "month" | "year") {
	if (currency.toUpperCase() !== "KES") throw new BillingError("Platform billing currently supports KES only", 400, "UNSUPPORTED_BILLING_CURRENCY")
	if (!priceId) return
	const price = await getStripeClient().prices.retrieve(priceId)
	if (price.currency.toUpperCase() !== "KES" || price.unit_amount !== stripeAmount(amount, "KES") || price.recurring?.interval !== interval) {
		throw new BillingError("The configured Stripe price does not match its KES amount and billing interval", 409, "STRIPE_PRICE_MISMATCH")
	}
}

async function ensureStripeCustomer(tenantId: string, ownerUserId: string, email: string) {
	const { customer } = await ensureBillingRecords(tenantId, ownerUserId)
	if (customer.stripeCustomerId) return customer.stripeCustomerId
	if (!isStripeConfigured()) throw new BillingError("Stripe is not configured. Choose M-Pesa or configure Stripe.", 503, "STRIPE_NOT_CONFIGURED")
	const stripe = getStripeClient()
	const created = await stripe.customers.create({ email, metadata: { tenantId } })
	await prisma.billingCustomer.update({ where: { tenantId }, data: { stripeCustomerId: created.id } })
	return created.id
}

function recurringLineItem(name: string, price: number, currency: string, interval: "month" | "year", stripePriceId?: string | null) {
	return stripePriceId
		? { price: stripePriceId, quantity: 1 }
		: { price_data: { currency: currency.toLowerCase(), product_data: { name }, unit_amount: stripeAmount(price, currency), recurring: { interval }, ...(configuredSaasVatRate() > 0 ? { tax_behavior: "inclusive" as const } : {}) }, quantity: 1 }
}

export async function createStripeCheckoutSession(input: { tenantId: string; ownerUserId: string; email: string; planKey: string; addonKeys?: string[]; successUrl: string; cancelUrl: string }) {
	if (isMpesaOnlySaasBilling()) throw new BillingError("M-Pesa is the only supported platform billing method at launch", 409, "MPESA_ONLY_BILLING")
	if (!isStripeConfigured()) throw new BillingError("Stripe is not configured", 503, "STRIPE_NOT_CONFIGURED")
	const { plan, addons } = await getPlanAndAddons(input.planKey, input.addonKeys || [])
	await verifyStripePriceConfiguration(plan.stripePriceId, plan.price || 0, plan.currency, plan.billingInterval === "YEAR" ? "year" : "month")
	for (const addon of addons) await verifyStripePriceConfiguration(addon.stripePriceId, addon.price, addon.currency, addon.billingInterval === "YEAR" ? "year" : "month")
	const billing = await ensureBillingRecords(input.tenantId, input.ownerUserId)
	const existing = await prisma.subscription.findFirst({ where: { tenantId: input.tenantId, status: { in: [...paidSubscriptionStatuses] } }, orderBy: { createdAt: "desc" } })
	if (existing && existing.planId === plan.id && billing.record.setupFeeStatus !== BillingRecordStatus.PENDING) throw new BillingError("This plan is already active", 409, "PLAN_ALREADY_ACTIVE")
	const customerId = await ensureStripeCustomer(input.tenantId, input.ownerUserId, input.email)
	const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [recurringLineItem(plan.name, plan.price || 0, plan.currency, plan.billingInterval === "YEAR" ? "year" : "month", plan.stripePriceId)]
	for (const addon of addons) lineItems.push(recurringLineItem(addon.name, addon.price, addon.currency, addon.billingInterval === "YEAR" ? "year" : "month", addon.stripePriceId))
	if (billing.record.setupFeeStatus === BillingRecordStatus.PENDING && billing.record.setupFeeAmount > 0) {
			lineItems.push({ price_data: { currency: billing.record.currency.toLowerCase(), product_data: { name: "One-time onboarding/setup fee" }, unit_amount: stripeAmount(billing.record.setupFeeAmount, billing.record.currency), ...(configuredSaasVatRate() > 0 ? { tax_behavior: "inclusive" } : {}) }, quantity: 1 })
	}
	const subscription = await prisma.subscription.create({ data: { tenantId: input.tenantId, planId: plan.id, status: "INCOMPLETE", provider: "stripe", providerCustomerId: customerId } })
	try {
		const stripe = getStripeClient()
		const session = await stripe.checkout.sessions.create({
			mode: "subscription",
			customer: customerId,
			line_items: lineItems,
			success_url: input.successUrl,
			cancel_url: input.cancelUrl,
			subscription_data: { metadata: { tenantId: input.tenantId, planId: plan.id, subscriptionId: subscription.id, billingRecordId: billing.record.id } },
			metadata: { tenantId: input.tenantId, planId: plan.id, subscriptionId: subscription.id, billingRecordId: billing.record.id },
			customer_update: { address: "auto", name: "auto" },
		})
		await prisma.subscription.update({ where: { id: subscription.id }, data: { providerCheckoutSessionId: session.id } })
		return { id: session.id, url: session.url, subscriptionId: subscription.id, provider: "stripe" as const }
	} catch (error) {
		await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED" } }).catch(() => undefined)
		throw error
	}
}

export async function changeSubscriptionPlan(input: { tenantId: string; ownerUserId: string; email: string; planKey: string; successUrl: string; cancelUrl: string }) {
	const current = await prisma.subscription.findFirst({ where: { tenantId: input.tenantId, status: { in: [...billableSubscriptionStatuses] } }, orderBy: { createdAt: "desc" } })
	if (!current) return createStripeCheckoutSession(input)
	const { plan } = await getPlanAndAddons(input.planKey, [])
	if (current.planId === plan.id) throw new BillingError("This plan is already active", 409, "PLAN_ALREADY_ACTIVE")
	if (isMpesaOnlySaasBilling()) {
		const scheduled = await prisma.subscription.update({ where: { id: current.id }, data: { pendingPlanId: plan.id } })
		return { subscriptionId: scheduled.id, provider: "mpesa" as const, changed: false, scheduled: true, nextRenewal: true, plan: plan.name }
	}
	if (current.provider !== "stripe" || !current.providerSubscriptionId || !isStripeConfigured()) throw new BillingError("This subscription uses invoice-driven billing. Request an M-Pesa renewal after the platform configures the target plan price.", 409, "PLAN_CHANGE_REQUIRES_PROVIDER")
	if (!plan.stripePriceId) throw new BillingError("The target plan needs a Stripe price ID before an existing subscription can be changed", 409, "PLAN_PRICE_NOT_CONFIGURED")
	if (!plan.price || !plan.billingInterval) throw new BillingError("The target plan is not configured for paid billing", 409, "PLAN_NOT_BILLABLE")
	await verifyStripePriceConfiguration(plan.stripePriceId, plan.price, plan.currency, plan.billingInterval === "YEAR" ? "year" : "month")
	const stripe = getStripeClient()
	const remote = await stripe.subscriptions.retrieve(current.providerSubscriptionId)
	const baseItem = remote.items?.data?.[0]
	if (!baseItem?.id) throw new BillingError("Stripe subscription items are unavailable", 502, "STRIPE_SUBSCRIPTION_INVALID")
	const updatedRemote = await stripe.subscriptions.update(current.providerSubscriptionId, { items: [{ id: baseItem.id, price: plan.stripePriceId }], proration_behavior: "create_prorations", metadata: { tenantId: input.tenantId, planId: plan.id, subscriptionId: current.id } })
	const updated = await prisma.subscription.update({ where: { id: current.id }, data: { planId: plan.id, status: mapStripeSubscriptionStatus(updatedRemote.status), currentPeriodStart: dateFromUnix("current_period_start" in updatedRemote ? updatedRemote.current_period_start : undefined), currentPeriodEnd: dateFromUnix("current_period_end" in updatedRemote ? updatedRemote.current_period_end : undefined) } })
	await prisma.tenant.update({ where: { id: input.tenantId }, data: { planId: plan.id } })
	return { subscriptionId: updated.id, provider: "stripe" as const, changed: true }
}

export async function createMpesaInvoicePayment(input: { tenantId: string; ownerUserId: string; phone: string; kind?: InvoiceKind; destinationType?: PlatformMpesaAccountType; destinationVersion?: number | null }) {
	const destination = await selectBillingDestination(input)
	const manualPhonePayment = destination.accountType === "PHONE"
	const payerPhone = manualPhonePayment ? normalizePhone(input.phone) : input.phone
	const platformMpesa = manualPhonePayment ? null : await getPlatformMpesaCredentialsForDestination(destination)
	if (!manualPhonePayment && !platformMpesa?.credentials) throw new BillingError("Platform Daraja credentials are not configured for this payment destination", 503, "MPESA_DESTINATION_NOT_CONFIGURED")
	const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId }, include: { plan: true, billingRecord: true, subscriptions: { where: { status: { in: [...billableSubscriptionStatuses] } }, orderBy: { createdAt: "desc" }, take: 1, include: { plan: true, pendingPlan: true, addonSubscriptions: { where: { status: { in: ["ACTIVE", "INCOMPLETE"] } }, include: { addon: true } } } } } })
	if (tenant?.billingRecord && tenant.billingRecord.setupFeeAmount > 0 && tenant.billingRecord.setupFeeStatus !== BillingRecordStatus.PAID && tenant.billingRecord.setupFeeStatus !== BillingRecordStatus.WAIVED) {
		throw new BillingError("Pay the one-time setup fee first. Your six-month pilot starts after payment is confirmed.", 409, "SETUP_FEE_REQUIRED")
	}
	if (!tenant?.plan || !tenant.subscriptions[0]) throw new BillingError("A subscription is required before requesting a payment", 409, "NO_SUBSCRIPTION")
	const subscription = tenant.subscriptions[0]
	const billingPlan = subscription.pendingPlan || subscription.plan || tenant.plan
	const addonTotal = subscription.addonSubscriptions.reduce((sum, item) => sum + item.addon.price, 0)
	const setupFeeAmount = tenant.billingRecord && tenant.billingRecord.setupFeeStatus !== BillingRecordStatus.PAID ? tenant.billingRecord.setupFeeAmount : 0
	const firstActivation = subscription.status === "TRIALING" || !subscription.currentPeriodStart
	if (firstActivation && subscription.trialEndsAt && subscription.trialEndsAt > new Date()) throw new BillingError("Your six-month pilot is still active. Monthly payment becomes available from month seven.", 409, "TRIAL_ACTIVE")
	const totals = calculateSaasInvoiceTotals({ subscription: billingPlan.price || 0, addons: addonTotal, setupFee: firstActivation ? setupFeeAmount : 0, vatRate: configuredSaasVatRate() })
	if (totals.grossAmount <= 0) throw new BillingError("The selected plan has no payable amount", 409, "BILLING_TOTAL_ZERO")
	const kind = firstActivation ? InvoiceKind.SUBSCRIPTION : input.kind || InvoiceKind.RENEWAL
	// Reuse one active invoice/payment per tenant subscription so browser and
	// provider retries do not create duplicate payment prompts.
	const billingAttempt = await prisma.$transaction(async (transaction) => {
		await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.tenantId}:${subscription.id}:${kind}`}))`
		const existing = await transaction.invoice.findFirst({ where: { tenantId: input.tenantId, subscriptionId: subscription.id, kind, status: "OPEN", provider: { in: ["mpesa", "mpesa-manual"] } }, orderBy: { createdAt: "desc" }, include: { payments: { where: { kind: { not: "ORDER" } }, orderBy: { createdAt: "desc" }, take: 1 } } })
		const existingPayment = existing?.payments[0]
		if (existing && existingPayment && ["PENDING", "PROCESSING", "COMPLETED"].includes(existingPayment.status)) {
			assertPendingPaymentDestination(existingPayment, destination)
			return { invoice: existing, payment: existingPayment, created: false }
		}
		const billingProvider = manualPhonePayment ? "mpesa-manual" : "mpesa"
		const destinationMetadata = { accountType: destination.accountType, accountNumber: destination.accountNumber, version: destination.version }
		const invoice = existing
			? await transaction.invoice.update({ where: { id: existing.id }, data: { provider: billingProvider, metadata: { ...(existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata) ? existing.metadata as Record<string, unknown> : {}), platformPaymentDestination: destinationMetadata } as Prisma.InputJsonValue } })
			: await transaction.invoice.create({ data: { tenantId: input.tenantId, subscriptionId: subscription.id, kind, status: "OPEN", provider: billingProvider, subtotal: billingPlan.price || 0, addonTotal, setupFeeAmount: firstActivation ? setupFeeAmount : 0, grossTotal: totals.grossAmount, taxableAmount: totals.netAmount, taxRate: totals.vatRate, taxAmount: totals.taxAmount, total: totals.grossAmount, currency: billingPlan.currency, dueDate: new Date(Date.now() + 3 * 86400000), metadata: { platformPaymentDestination: destinationMetadata } } })
		const creditAmount = existing ? existing.creditAmount : await reserveBillingCredits(transaction, input.tenantId, billingPlan.currency, totals.grossAmount, invoice.id)
		const updatedInvoice = existing ? invoice : await transaction.invoice.update({ where: { id: invoice.id }, data: { creditAmount, total: totals.grossAmount - creditAmount } })
		const payment = await transaction.payment.create({ data: { tenantId: input.tenantId, invoiceId: invoice.id, subscriptionId: subscription.id, billingRecordId: firstActivation && setupFeeAmount > 0 ? tenant.billingRecord?.id : undefined, provider: updatedInvoice.total === 0 ? "internal-credit" : billingProvider, amount: updatedInvoice.total, currency: updatedInvoice.currency, status: updatedInvoice.total === 0 ? "COMPLETED" : "PENDING", kind: firstActivation ? BillingPaymentKind.SUBSCRIPTION : BillingPaymentKind.RENEWAL, phoneNumber: manualPhonePayment ? payerPhone : undefined, metadata: { invoiceId: invoice.id, reference: `INV-${invoice.id}`, invoiceKind: invoice.kind, operation: "subscription-invoice", platformPaymentDestination: destinationMetadata } } })
		return { invoice: updatedInvoice, payment, created: true }
	})
	const invoice = billingAttempt.invoice
	const paymentReservation = billingAttempt.payment
	if (!billingAttempt.created && paymentReservation.status === "COMPLETED") return { ok: true, provider: "internal-credit" as const, reference: `INV-${invoice.id}`, checkoutRequestId: "", phone: input.phone, amount: 0, currency: invoice.currency, status: "COMPLETED" as const, message: "Invoice settlement already completed.", invoiceId: invoice.id }
	if (paymentReservation.provider === "mpesa-manual" && ["PENDING", "PROCESSING"].includes(paymentReservation.status)) {
		const metadata = paymentReservation.metadata as { platformPaymentDestination?: { accountType?: string; accountNumber?: string }; manualReceiptCode?: string } | null
		return { ok: true, provider: "mpesa-manual" as const, reference: `INV-${invoice.id}`, checkoutRequestId: "", phone: paymentReservation.phoneNumber || payerPhone, amount: paymentReservation.amount, currency: paymentReservation.currency, status: "PENDING" as const, message: metadata?.manualReceiptCode ? "Your M-Pesa receipt is awaiting platform administrator verification." : "Send the invoice amount to the platform M-Pesa phone number, then submit the receipt for administrator verification.", invoiceId: invoice.id, paymentId: paymentReservation.id, manualTransfer: metadata?.platformPaymentDestination }
	}
	if (!billingAttempt.created && paymentReservation.status === "PROCESSING") return { ok: true, provider: "mpesa" as const, reference: `INV-${invoice.id}`, checkoutRequestId: "", phone: input.phone, amount: paymentReservation.amount, currency: paymentReservation.currency, status: "PENDING" as const, message: "An M-Pesa request is already being initiated.", invoiceId: invoice.id }
	if (invoice.total === 0) {
		await markBillingPaymentFromMpesa({ id: paymentReservation.id, status: "COMPLETED", invoiceId: invoice.id, subscriptionId: subscription.id, billingRecordId: firstActivation && setupFeeAmount > 0 ? tenant.billingRecord?.id : undefined })
		return { ok: true, provider: "internal-credit" as const, reference: `INV-${invoice.id}`, checkoutRequestId: "", phone: input.phone, amount: 0, currency: invoice.currency, status: "COMPLETED", message: "Invoice settled by account credit.", invoiceId: invoice.id }
	}
	if (manualPhonePayment) throw new BillingError("The manual M-Pesa payment record could not be prepared", 500, "MANUAL_PAYMENT_SETUP_FAILED")
	let result
	try {
		result = await initiateMpesaPayment({ amount: invoice.total, phone: input.phone, reference: `INV-${invoice.id}`, tenantId: input.tenantId, paymentId: paymentReservation.id, invoiceId: invoice.id, subscriptionId: subscription.id, billingRecordId: firstActivation && setupFeeAmount > 0 ? tenant.billingRecord?.id : undefined, kind: firstActivation ? BillingPaymentKind.SUBSCRIPTION : BillingPaymentKind.RENEWAL, platformCredentials: platformMpesa?.credentials || undefined, metadata: { invoiceId: invoice.id, invoiceKind: invoice.kind, planId: billingPlan.id, grossTotal: totals.grossAmount, taxRate: totals.vatRate, taxAmount: totals.taxAmount, creditAmount: invoice.creditAmount, ...(platformMpesa?.version != null ? { platformMpesaDestinationVersion: platformMpesa.version } : { platformMpesaDestinationEnvironment: true }) } })
	} catch (error) {
		await prisma.payment.update({ where: { id: paymentReservation.id }, data: { status: "FAILED", failureReason: "M-Pesa initiation failed" } }).catch(() => undefined)
		await releaseInvoiceCredits(invoice.id).catch(() => undefined)
		await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "FAILED" } }).catch(() => undefined)
		throw error
	}
	if (!result.ok) {
		await releaseInvoiceCredits(invoice.id)
		await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "FAILED" } })
	}
	return { ...result, invoiceId: invoice.id }
}

export async function createSetupFeeMpesaPayment(input: { tenantId: string; ownerUserId: string; phone: string; destinationType?: PlatformMpesaAccountType; destinationVersion?: number | null }) {
	const destination = await selectBillingDestination(input)
	const manualPhonePayment = destination.accountType === "PHONE"
	const payerPhone = manualPhonePayment ? normalizePhone(input.phone) : input.phone
	const platformMpesa = manualPhonePayment ? null : await getPlatformMpesaCredentialsForDestination(destination)
	if (!manualPhonePayment && !platformMpesa?.credentials) throw new BillingError("Platform Daraja credentials are not configured for this payment destination", 503, "MPESA_DESTINATION_NOT_CONFIGURED")
	const tenant = await prisma.tenant.findUnique({
		where: { id: input.tenantId },
		include: { plan: true, billingRecord: true, subscriptions: { where: { status: "INCOMPLETE" }, orderBy: { createdAt: "desc" }, take: 1 } },
	})
	if (!tenant?.plan || !tenant.billingRecord || !tenant.subscriptions[0]) throw new BillingError("This store has no setup fee awaiting payment", 409, "SETUP_FEE_NOT_REQUIRED")
	const billingRecord = tenant.billingRecord
	if (billingRecord.setupFeeStatus === BillingRecordStatus.PAID || billingRecord.setupFeeStatus === BillingRecordStatus.WAIVED) {
		return { ok: true, provider: "internal" as const, reference: "SETUP-FEE-PAID", checkoutRequestId: "", phone: input.phone, amount: 0, currency: billingRecord.currency, status: "COMPLETED" as const, message: "The setup fee has already been paid." }
	}
	if (billingRecord.setupFeeAmount <= 0) throw new BillingError("This plan does not have a setup fee", 409, "SETUP_FEE_NOT_REQUIRED")

	const totals = calculateSaasInvoiceTotals({ subscription: 0, setupFee: billingRecord.setupFeeAmount, vatRate: configuredSaasVatRate() })
	const reservation = await prisma.$transaction(async (transaction) => {
		await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.tenantId}:setup-fee`}))`
		const existingInvoice = await transaction.invoice.findFirst({ where: { tenantId: input.tenantId, kind: InvoiceKind.SETUP_FEE, status: InvoiceStatus.OPEN }, orderBy: { createdAt: "desc" }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } })
		const latestPayment = existingInvoice?.payments[0]
		if (existingInvoice && latestPayment && ["COMPLETED", "PROCESSING", "PENDING"].includes(latestPayment.status)) {
			assertPendingPaymentDestination(latestPayment, destination)
			return { invoice: existingInvoice, payment: latestPayment }
		}
		const invoice = existingInvoice
			? await transaction.invoice.update({ where: { id: existingInvoice.id }, data: { status: InvoiceStatus.OPEN, paidAt: null, provider: manualPhonePayment ? "mpesa-manual" : "mpesa", metadata: { ...(existingInvoice.metadata && typeof existingInvoice.metadata === "object" && !Array.isArray(existingInvoice.metadata) ? existingInvoice.metadata as Record<string, unknown> : {}), platformPaymentDestination: { accountType: destination.accountType, accountNumber: destination.accountNumber, version: destination.version } } as Prisma.InputJsonValue } })
			: await transaction.invoice.create({ data: { tenantId: input.tenantId, kind: InvoiceKind.SETUP_FEE, status: InvoiceStatus.OPEN, provider: manualPhonePayment ? "mpesa-manual" : "mpesa", subtotal: billingRecord.setupFeeAmount, setupFeeAmount: billingRecord.setupFeeAmount, grossTotal: totals.grossAmount, taxableAmount: totals.netAmount, taxRate: totals.vatRate, taxAmount: totals.taxAmount, total: totals.grossAmount, currency: billingRecord.currency, dueDate: new Date(Date.now() + 3 * 86400000), metadata: { operation: "one-time-store-setup", platformPaymentDestination: { accountType: destination.accountType, accountNumber: destination.accountNumber, version: destination.version } } } })
		const payment = await transaction.payment.create({ data: { tenantId: input.tenantId, invoiceId: invoice.id, billingRecordId: billingRecord.id, provider: manualPhonePayment ? "mpesa-manual" : "mpesa", amount: invoice.total, currency: invoice.currency, status: "PENDING", kind: BillingPaymentKind.SETUP_FEE, phoneNumber: manualPhonePayment ? payerPhone : undefined, metadata: { invoiceId: invoice.id, reference: `SET-${invoice.id}`, operation: "one-time-store-setup", platformPaymentDestination: { accountType: destination.accountType, accountNumber: destination.accountNumber, version: destination.version } } } })
		return { invoice, payment }
	})
	const { invoice, payment } = reservation
	if (payment.status === "COMPLETED") return { ok: true, provider: "mpesa" as const, reference: `SET-${invoice.id}`, checkoutRequestId: payment.providerReference || "", phone: input.phone, amount: payment.amount, currency: payment.currency, status: "COMPLETED" as const, message: "The setup fee has already been paid.", invoiceId: invoice.id }
	if (payment.provider === "mpesa-manual" && ["PENDING", "PROCESSING"].includes(payment.status)) {
		const metadata = payment.metadata as { platformPaymentDestination?: { accountType?: string; accountNumber?: string }; manualReceiptCode?: string } | null
		return { ok: true, provider: "mpesa-manual" as const, reference: `SET-${invoice.id}`, checkoutRequestId: "", phone: payment.phoneNumber || payerPhone, amount: payment.amount, currency: payment.currency, status: "PENDING" as const, message: metadata?.manualReceiptCode ? "Your M-Pesa receipt is awaiting platform administrator verification." : "Send the setup-fee amount to the platform M-Pesa phone number, then submit the receipt for administrator verification.", invoiceId: invoice.id, paymentId: payment.id, manualTransfer: metadata?.platformPaymentDestination }
	}
	if ((payment.status === "PROCESSING" || payment.status === "PENDING") && payment.providerReference) return { ok: true, provider: "mpesa" as const, reference: `SET-${invoice.id}`, checkoutRequestId: payment.providerReference, phone: input.phone, amount: payment.amount, currency: payment.currency, status: "PENDING" as const, message: "An M-Pesa setup-fee request is already pending.", invoiceId: invoice.id }
	if (manualPhonePayment) throw new BillingError("The manual M-Pesa payment record could not be prepared", 500, "MANUAL_PAYMENT_SETUP_FAILED")
	let result
	try {
		result = await initiateMpesaPayment({ amount: invoice.total, phone: input.phone, reference: `SET-${invoice.id}`, tenantId: input.tenantId, paymentId: payment.id, invoiceId: invoice.id, billingRecordId: billingRecord.id, kind: BillingPaymentKind.SETUP_FEE, platformCredentials: platformMpesa?.credentials || undefined, metadata: { invoiceId: invoice.id, invoiceKind: invoice.kind, operation: "one-time-store-setup", ...(platformMpesa?.version != null ? { platformMpesaDestinationVersion: platformMpesa.version } : { platformMpesaDestinationEnvironment: true }) } })
	} catch (error) {
		await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "M-Pesa setup-fee initiation failed" } }).catch(() => undefined)
		await prisma.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.FAILED } }).catch(() => undefined)
		throw error
	}
	if (!result.ok) {
		await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: result.message } }).catch(() => undefined)
		await prisma.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.FAILED } }).catch(() => undefined)
	}
	return { ...result, invoiceId: invoice.id }
}

export async function submitManualBillingReceipt(input: { tenantId: string; paymentId: string; receiptCode: string }) {
	const receiptCode = input.receiptCode.trim().toUpperCase()
	if (!/^[A-Z0-9]{8,12}$/.test(receiptCode)) throw new BillingError("Enter the M-Pesa receipt code shown in the confirmation message", 400, "INVALID_MPESA_RECEIPT")
	const payment = await prisma.payment.findFirst({ where: { id: input.paymentId, tenantId: input.tenantId, provider: "mpesa-manual", kind: { not: "ORDER" } } })
	if (!payment || payment.status !== "PENDING" || payment.providerReference) throw new BillingError("This manual billing payment is no longer awaiting a receipt", 409, "MANUAL_PAYMENT_NOT_PENDING")
	const metadata = (payment.metadata || {}) as Record<string, unknown>
	const destination = metadata.platformPaymentDestination as { accountType?: unknown } | undefined
	if (destination?.accountType !== "PHONE") throw new BillingError("This payment was not created for a phone-number transfer", 409, "MANUAL_PAYMENT_DESTINATION_MISMATCH")
	const existingReceipt = await prisma.payment.findUnique({ where: { providerReference: receiptCode }, select: { id: true } })
	if (existingReceipt) throw new BillingError("That M-Pesa receipt code has already been submitted", 409, "DUPLICATE_MPESA_RECEIPT")
	const submittedAt = new Date().toISOString()
	let update
	try {
		update = await prisma.payment.updateMany({
			where: { id: payment.id, tenantId: input.tenantId, provider: "mpesa-manual", status: "PENDING", providerReference: null },
			data: { providerReference: receiptCode, status: "PROCESSING", metadata: { ...metadata, manualReceiptCode: receiptCode, manualReceiptSubmittedAt: submittedAt } },
		})
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new BillingError("That M-Pesa receipt code has already been submitted", 409, "DUPLICATE_MPESA_RECEIPT")
		throw error
	}
	if (!update.count) throw new BillingError("This payment was submitted by another request. Refresh billing and check its status.", 409, "MANUAL_PAYMENT_ALREADY_SUBMITTED")
	return { paymentId: payment.id, status: "PROCESSING" as const, message: "Receipt submitted. Platform staff will verify it before the invoice or pilot is updated." }
}

export async function reviewManualBillingPayment(input: { paymentId: string; reviewerId: string; approve: boolean; note?: string }) {
	const payment = await prisma.payment.findFirst({ where: { id: input.paymentId, provider: "mpesa-manual", kind: { not: "ORDER" } } })
	if (!payment) throw new BillingError("Manual billing payment not found", 404, "MANUAL_PAYMENT_NOT_FOUND")
	const metadata = (payment.metadata || {}) as Record<string, unknown>
	const receiptCode = typeof metadata.manualReceiptCode === "string" ? metadata.manualReceiptCode : ""
	const receiptSubmittedAt = typeof metadata.manualReceiptSubmittedAt === "string" ? metadata.manualReceiptSubmittedAt : null
	if (!receiptCode || payment.providerReference !== receiptCode) throw new BillingError("This payment has no submitted M-Pesa receipt to review", 409, "MANUAL_RECEIPT_NOT_SUBMITTED")
	const wasAlreadyApproved = payment.status === "COMPLETED" && metadata.manualReviewStatus === "APPROVED" && !metadata.manualBillingSettledAt
	if (payment.status !== "PROCESSING" && !wasAlreadyApproved && !(payment.status === "COMPLETED" && metadata.manualBillingSettledAt)) throw new BillingError("This manual receipt is no longer awaiting review", 409, "MANUAL_RECEIPT_ALREADY_REVIEWED")
	if (payment.status === "COMPLETED" && metadata.manualBillingSettledAt) return { paymentId: payment.id, status: "COMPLETED" as const, message: "This payment was already verified." }
	const reviewedAt = new Date().toISOString()
	if (!input.approve) {
		if (wasAlreadyApproved || metadata.manualReviewStatus === "APPROVED") throw new BillingError("An approved receipt cannot be rejected", 409, "MANUAL_RECEIPT_ALREADY_REVIEWED")
		const rejected = await prisma.payment.updateMany({ where: { id: payment.id, status: "PROCESSING", provider: "mpesa-manual" }, data: { status: "FAILED", failureReason: input.note?.slice(0, 500) || "Manual M-Pesa receipt was not verified", metadata: { ...metadata, manualReviewStatus: "REJECTED", manualReviewedAt: reviewedAt, manualReviewedBy: input.reviewerId, manualReviewNote: input.note?.slice(0, 500) || null } } })
		if (!rejected.count) throw new BillingError("The receipt was already reviewed", 409, "MANUAL_RECEIPT_ALREADY_REVIEWED")
		await markBillingPaymentFromMpesa({ id: payment.id, status: "FAILED", kind: payment.kind, invoiceId: payment.invoiceId, subscriptionId: payment.subscriptionId, billingRecordId: payment.billingRecordId, failureReason: input.note || "Manual M-Pesa receipt was not verified" })
		return { paymentId: payment.id, status: "FAILED" as const, message: "The receipt was rejected; the merchant can submit a new payment." }
	}
	if (!wasAlreadyApproved) {
		const claimed = await prisma.payment.updateMany({ where: { id: payment.id, status: "PROCESSING", provider: "mpesa-manual" }, data: { status: "COMPLETED", failureReason: null, metadata: { ...metadata, manualReviewStatus: "APPROVED", manualReviewedAt: reviewedAt, manualReviewedBy: input.reviewerId, manualReviewNote: input.note?.slice(0, 500) || null } } })
		if (!claimed.count) throw new BillingError("The receipt was already reviewed", 409, "MANUAL_RECEIPT_ALREADY_REVIEWED")
	}
	try {
		await markBillingPaymentFromMpesa({ id: payment.id, status: "COMPLETED", kind: payment.kind, invoiceId: payment.invoiceId, subscriptionId: payment.subscriptionId, billingRecordId: payment.billingRecordId })
	} catch (error) {
		await prisma.payment.update({ where: { id: payment.id }, data: { status: "PROCESSING", metadata: { ...metadata, manualReceiptCode: receiptCode, manualReceiptSubmittedAt: receiptSubmittedAt, manualReviewStatus: "APPROVED", manualReviewedAt: reviewedAt, manualReviewedBy: input.reviewerId, manualReviewNote: input.note?.slice(0, 500) || null, manualReviewRetryRequired: true } } }).catch(() => undefined)
		throw error
	}
	await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...metadata, manualReceiptCode: receiptCode, manualReceiptSubmittedAt: receiptSubmittedAt, manualReviewStatus: "APPROVED", manualReviewedAt: reviewedAt, manualReviewedBy: input.reviewerId, manualReviewNote: input.note?.slice(0, 500) || null, manualBillingSettledAt: new Date().toISOString() } } }).catch(() => undefined)
	return { paymentId: payment.id, status: "COMPLETED" as const, message: "The receipt was verified and billing was updated." }
}

export async function cancelSubscription(tenantId: string, immediate = false) {
	const subscription = await prisma.subscription.findFirst({ where: { tenantId, status: { in: [...paidSubscriptionStatuses] } }, orderBy: { createdAt: "desc" } })
	if (!subscription) throw new BillingError("No active subscription found", 404, "SUBSCRIPTION_NOT_FOUND")
	if (subscription.provider === "stripe" && subscription.providerSubscriptionId && isStripeConfigured()) {
		const stripe = getStripeClient()
		if (immediate) await stripe.subscriptions.cancel(subscription.providerSubscriptionId)
		else await stripe.subscriptions.update(subscription.providerSubscriptionId, { cancel_at_period_end: true })
	}
	if (!immediate) return prisma.subscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: true } })
	const cancelledAt = new Date()
	return prisma.$transaction(async (transaction) => {
		const updated = await transaction.subscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: false, status: "CANCELLED" as const } })
		await transaction.tenant.update({ where: { id: tenantId }, data: { status: "CANCELLED", dataRetentionStartsAt: cancelledAt, dataDeletionDueAt: retentionDueAt(cancelledAt) } })
		await transaction.store.updateMany({ where: { tenantId }, data: { publicationStatus: "SUSPENDED" } })
		return updated
	})
}

export async function subscribeToAddon(tenantId: string, addonKey: string) {
	const addon = await prisma.addon.findFirst({ where: { key: addonKey, active: true } })
	if (!addon) throw new BillingError("Add-on not found", 404, "ADDON_NOT_FOUND")
	const subscription = await prisma.subscription.findFirst({ where: { tenantId, status: { in: [...paidSubscriptionStatuses] } }, orderBy: { createdAt: "desc" } })
	if (!subscription) throw new BillingError("An active subscription is required", 409, "SUBSCRIPTION_NOT_FOUND")
	let providerSubscriptionItemId: string | undefined
	if (subscription.provider === "stripe" && subscription.providerSubscriptionId && addon.stripePriceId && isStripeConfigured()) {
		const item = await getStripeClient().subscriptionItems.create({ subscription: subscription.providerSubscriptionId, price: addon.stripePriceId, quantity: 1 })
		providerSubscriptionItemId = item.id
	}
	const status = isMpesaOnlySaasBilling() ? "INCOMPLETE" as const : "ACTIVE" as const
	return prisma.addonSubscription.upsert({ where: { tenantId_addonId: { tenantId, addonId: addon.id } }, update: { status, cancelAtPeriodEnd: false, subscriptionId: subscription.id, provider: subscription.provider || (isMpesaOnlySaasBilling() ? "mpesa" : undefined), providerSubscriptionItemId }, create: { tenantId, addonId: addon.id, subscriptionId: subscription.id, status, provider: subscription.provider || (isMpesaOnlySaasBilling() ? "mpesa" : undefined), providerSubscriptionItemId } })
}

export async function unsubscribeFromAddon(tenantId: string, addonKey: string) {
	const addon = await prisma.addon.findFirst({ where: { key: addonKey } })
	if (!addon) throw new BillingError("Add-on not found", 404, "ADDON_NOT_FOUND")
	const existing = await prisma.addonSubscription.findUnique({ where: { tenantId_addonId: { tenantId, addonId: addon.id } } })
	if (!existing) throw new BillingError("Add-on is not active", 404, "ADDON_SUBSCRIPTION_NOT_FOUND")
	if (existing.provider === "stripe" && existing.providerSubscriptionItemId && isStripeConfigured()) await getStripeClient().subscriptionItems.del(existing.providerSubscriptionItemId)
	return prisma.addonSubscription.update({ where: { id: existing.id }, data: { status: "CANCELLED", cancelAtPeriodEnd: true } })
}

export async function createCustomerPortalSession(tenantId: string, returnUrl: string) {
	if (isMpesaOnlySaasBilling()) throw new BillingError("M-Pesa is the only supported platform billing method at launch", 409, "MPESA_ONLY_BILLING")
	if (!isStripeConfigured()) throw new BillingError("Stripe is not configured", 503, "STRIPE_NOT_CONFIGURED")
	const customer = await prisma.billingCustomer.findUnique({ where: { tenantId } })
	if (!customer?.stripeCustomerId) throw new BillingError("No Stripe customer is linked to this tenant", 409, "STRIPE_CUSTOMER_NOT_FOUND")
	return getStripeClient().billingPortal.sessions.create({ customer: customer.stripeCustomerId, return_url: returnUrl })
}

export async function applyStripeSubscriptionEvent(subscriptionObject: StripeProviderPayload) {
	const providerId = String(subscriptionObject.id || "")
	const metadata = (subscriptionObject.metadata || {}) as Record<string, string>
	const tenantId = metadata.tenantId || undefined
	const local = await prisma.subscription.findFirst({ where: { OR: [{ providerSubscriptionId: providerId }, ...(tenantId ? [{ tenantId, id: metadata.subscriptionId || "" }] : [])] } })
	if (!local) return null
	const status = mapStripeSubscriptionStatus(String(subscriptionObject.status || "incomplete"))
	const updated = await prisma.subscription.update({ where: { id: local.id }, data: { provider: "stripe", providerSubscriptionId: providerId, providerCustomerId: String(subscriptionObject.customer || local.providerCustomerId || ""), status, currentPeriodStart: dateFromUnix(subscriptionObject.current_period_start), currentPeriodEnd: dateFromUnix(subscriptionObject.current_period_end), cancelAtPeriodEnd: Boolean(subscriptionObject.cancel_at_period_end) } })
	if (status === "ACTIVE") await restoreTenantAfterBillingPayment(updated.tenantId, updated.planId)
	else await prisma.tenant.update({ where: { id: updated.tenantId }, data: { status: tenantStatusForSubscription(status), planId: updated.planId } }).catch(() => undefined)
	return updated
}

export async function applyStripeCheckoutCompleted(sessionObject: StripeProviderPayload) {
	const metadata = (sessionObject.metadata || {}) as Record<string, string>
	const local = metadata.subscriptionId ? await prisma.subscription.findUnique({ where: { id: metadata.subscriptionId } }) : null
	if (!local) return null
	await prisma.subscription.update({ where: { id: local.id }, data: { provider: "stripe", providerCustomerId: String(sessionObject.customer || local.providerCustomerId || ""), providerSubscriptionId: typeof sessionObject.subscription === "string" ? sessionObject.subscription : undefined, status: "INCOMPLETE" } })
	if (metadata.billingRecordId) await prisma.billingRecord.update({ where: { id: metadata.billingRecordId }, data: { setupFeeStatus: "PENDING" } }).catch(() => undefined)
	return local.id
}

export async function applyStripeInvoiceEvent(invoiceObject: StripeProviderPayload, paid: boolean, failed = false) {
	const providerInvoiceId = String(invoiceObject.id || "")
	if (!providerInvoiceId) return null
	const subscriptionId = typeof invoiceObject.subscription === "string" ? invoiceObject.subscription : undefined
	const localSubscription = subscriptionId ? await prisma.subscription.findFirst({ where: { providerSubscriptionId: subscriptionId } }) : null
	const metadata = (invoiceObject.metadata || {}) as Record<string, string>
	const invoiceTenantId = localSubscription?.tenantId || metadata.tenantId
	if (!invoiceTenantId) return null
	const localInvoice = await prisma.invoice.upsert({
		where: { providerInvoiceId },
		update: { status: paid ? "PAID" : failed ? "FAILED" : "OPEN", paidAt: paid ? new Date() : undefined, hostedInvoiceUrl: invoiceObject.hosted_invoice_url || undefined, invoicePdfUrl: invoiceObject.invoice_pdf || undefined },
		create: { tenantId: invoiceTenantId, subscriptionId: localSubscription?.id, kind: "RENEWAL", status: paid ? "PAID" : failed ? "FAILED" : "OPEN", provider: "stripe", providerInvoiceId, subtotal: Math.round(Number(invoiceObject.subtotal || invoiceObject.amount_due || 0) / 100), grossTotal: Math.round(Number(invoiceObject.amount_due || 0) / 100), total: Math.round(Number(invoiceObject.amount_paid || invoiceObject.amount_due || 0) / 100), currency: String(invoiceObject.currency || "kes").toUpperCase(), paidAt: paid ? new Date() : undefined, hostedInvoiceUrl: invoiceObject.hosted_invoice_url || undefined, invoicePdfUrl: invoiceObject.invoice_pdf || undefined },
	})
	const paymentIntentId = typeof invoiceObject.payment_intent === "string" ? invoiceObject.payment_intent : undefined
	if (paymentIntentId && localInvoice.tenantId) {
		await prisma.payment.upsert({ where: { providerReference: paymentIntentId }, update: { status: paid ? "COMPLETED" : failed ? "FAILED" : "PENDING", invoiceId: localInvoice.id, subscriptionId: localSubscription?.id, failureReason: failed ? "Stripe invoice payment failed" : undefined }, create: { tenantId: localInvoice.tenantId, invoiceId: localInvoice.id, subscriptionId: localSubscription?.id, provider: "stripe", providerReference: paymentIntentId, amount: Number(invoiceObject.amount_paid || invoiceObject.amount_due || 0) / 100, currency: localInvoice.currency, status: paid ? "COMPLETED" : failed ? "FAILED" : "PENDING", kind: "RENEWAL", metadata: { providerInvoiceId } } })
	}
	if (localSubscription) await prisma.subscription.update({ where: { id: localSubscription.id }, data: { status: paid ? "ACTIVE" : failed ? "PAST_DUE" : localSubscription.status } })
	if (paid && localSubscription) await restoreTenantAfterBillingPayment(localSubscription.tenantId, localSubscription.planId)
	if (paid) {
		const billingRecord = metadata.billingRecordId
			? await prisma.billingRecord.findUnique({ where: { id: metadata.billingRecordId } })
			: localSubscription ? await prisma.billingRecord.findUnique({ where: { tenantId: localSubscription.tenantId } }) : null
		if (billingRecord?.setupFeeStatus === BillingRecordStatus.PENDING) {
			await prisma.billingRecord.update({ where: { id: billingRecord.id }, data: { setupFeeStatus: BillingRecordStatus.PAID, setupFeePaidAt: new Date(), failureReason: null } })
			await prisma.invoice.updateMany({ where: { tenantId: billingRecord.tenantId, kind: "SETUP_FEE", status: "OPEN" }, data: { status: "PAID", paidAt: new Date() } }).catch(() => undefined)
		}
	}
	return localInvoice
}

export async function markBillingPaymentFromMpesa(payment: { id: string; status: string; kind?: string; invoiceId?: string | null; subscriptionId?: string | null; billingRecordId?: string | null; failureReason?: string | null }) {
	const completed = payment.status === "COMPLETED"
	if (payment.invoiceId) await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: completed ? "PAID" : "FAILED", paidAt: completed ? new Date() : undefined } }).catch(() => undefined)
	if (payment.invoiceId) await (completed ? finalizeInvoiceCredits(payment.invoiceId) : releaseInvoiceCredits(payment.invoiceId)).catch(() => undefined)
	if (payment.kind === BillingPaymentKind.SETUP_FEE && payment.billingRecordId) {
		if (!completed) {
			await prisma.billingRecord.update({ where: { id: payment.billingRecordId }, data: { setupFeeStatus: "FAILED", failureReason: payment.failureReason || "M-Pesa payment failed" } }).catch(() => undefined)
			return
		}
		await prisma.$transaction(async (transaction) => {
			const billingRecord = await transaction.billingRecord.findUnique({ where: { id: payment.billingRecordId as string } })
			if (!billingRecord || billingRecord.setupFeeStatus === BillingRecordStatus.PAID || billingRecord.setupFeeStatus === BillingRecordStatus.WAIVED) return
			const subscription = await transaction.subscription.findFirst({ where: { tenantId: billingRecord.tenantId, status: "INCOMPLETE" }, orderBy: { createdAt: "desc" } })
			if (!subscription) throw new BillingError("The store pilot could not be activated because its pending subscription was not found", 409, "PILOT_SUBSCRIPTION_NOT_FOUND")
			const startsAt = new Date()
			const endsAt = pilotTrialEndsAt(startsAt)
			await transaction.billingRecord.update({ where: { id: billingRecord.id }, data: { setupFeeStatus: "PAID", setupFeePaidAt: startsAt, failureReason: null } })
			await transaction.subscription.update({ where: { id: subscription.id }, data: { status: "TRIALING", trialStartsAt: startsAt, trialEndsAt: endsAt } })
			await transaction.tenant.update({ where: { id: billingRecord.tenantId }, data: { status: "TRIALING", planId: subscription.planId, trialStartsAt: startsAt, trialEndsAt: endsAt } })
		})
		return
	}
	if (payment.subscriptionId && completed) {
		const subscription = await prisma.subscription.findUnique({ where: { id: payment.subscriptionId }, select: { tenantId: true, pendingPlanId: true } })
		const activated = await prisma.subscription.update({ where: { id: payment.subscriptionId }, data: { status: "ACTIVE", planId: subscription?.pendingPlanId || undefined, pendingPlanId: null, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000), gracePeriodEndsAt: null } }).catch(() => null)
		if (activated) {
			await prisma.addonSubscription.updateMany({ where: { subscriptionId: payment.subscriptionId, status: "INCOMPLETE" }, data: { status: "ACTIVE" } }).catch(() => undefined)
			await restoreTenantAfterBillingPayment(activated.tenantId, activated.planId)
		}
	}
	if (payment.billingRecordId) await prisma.billingRecord.update({ where: { id: payment.billingRecordId }, data: { setupFeeStatus: completed ? "PAID" : "FAILED", setupFeePaidAt: completed ? new Date() : undefined, failureReason: completed ? null : payment.failureReason || "M-Pesa payment failed" } }).catch(() => undefined)
}

export async function recordOrderCommission(paymentId: string) {
	if (!isShopperCheckoutEnabled()) return null
	const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { tenant: { include: { plan: true } } } })
	if (!payment?.tenantId || !payment.orderId || payment.status !== "COMPLETED") return null
	// Merchant-routed shopper sales never generate platform commission. Keep a
	// zero-valued transaction audit row so reconciliation can prove the payment
	// was processed without treating it as SaaS revenue.
	const rate = 0
	return prisma.transaction.upsert({
		where: { paymentId },
		update: { grossAmount: payment.amount, commissionRate: rate, commissionAmount: 0, status: "COMPLETED", metadata: { commissionPolicy: "ZERO_PRODUCT_COMMISSION" } },
		create: { tenantId: payment.tenantId, orderId: payment.orderId, paymentId, currency: payment.currency, grossAmount: payment.amount, commissionRate: rate, commissionAmount: 0, status: "COMPLETED", metadata: { commissionPolicy: "ZERO_PRODUCT_COMMISSION" } },
	})
}
