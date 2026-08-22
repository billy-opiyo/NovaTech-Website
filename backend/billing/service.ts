import type Stripe from "stripe"
import { BillingPaymentKind, BillingRecordStatus, InvoiceKind, InvoiceStatus, SubscriptionStatus } from "@prisma/client"
import prisma from "../lib/db"
import { retentionDueAt } from "../retention/tenant-retention"
import { getStripeClient, isStripeConfigured } from "../lib/stripeClient"
import { initiateMpesaPayment } from "../payments/mpesa"
import { isShopperCheckoutEnabled } from "../lib/commerce-model"

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
const saasBillingProvider = (process.env.NURAVA_SAAS_BILLING_PROVIDER || "mpesa").toLowerCase()

export function isMpesaOnlySaasBilling() {
	return saasBillingProvider === "mpesa"
}

function stripeAmount(amount: number, currency: string) {
	// Nurava Tech stores customer-facing amounts in currency units. Stripe's
	// Checkout price_data expects the smallest currency unit.
	return Math.round(amount * (currency.toUpperCase() === "JPY" ? 1 : 100))
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
		},
	})
	if (!tenant) throw new BillingError("Tenant not found", 404, "TENANT_NOT_FOUND")
	const usage = await prisma.usageCounter.findMany({ where: { tenantId, periodStart: { lte: now }, periodEnd: { gt: now } }, orderBy: { metric: "asc" }, select: { metric: true, value: true, periodStart: true, periodEnd: true } })
	const activeAddons = tenant.subscriptions[0]?.addonSubscriptions.filter((item) => ["ACTIVE", "PAST_DUE"].includes(item.status)) || []
	const pendingAddons = tenant.subscriptions[0]?.addonSubscriptions.filter((item) => item.status === "INCOMPLETE") || []
	return { tenant, subscription: tenant.subscriptions[0] || null, activeAddons, pendingAddons, usage }
}

async function getPlanAndAddons(planKey: string, addonKeys: string[]) {
	const plan = await prisma.plan.findFirst({ where: { key: planKey, active: true } })
	if (!plan) throw new BillingError("The selected plan is unavailable", 404, "PLAN_NOT_FOUND")
	if (!plan.price || !plan.billingInterval) throw new BillingError("The selected plan is not configured for paid billing", 409, "PLAN_NOT_BILLABLE")
	const addons = addonKeys.length ? await prisma.addon.findMany({ where: { key: { in: addonKeys }, active: true } }) : []
	if (addons.length !== new Set(addonKeys).size) throw new BillingError("One or more selected add-ons are unavailable", 409, "ADDON_NOT_FOUND")
	return { plan, addons }
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
		: { price_data: { currency: currency.toLowerCase(), product_data: { name }, unit_amount: stripeAmount(price, currency), recurring: { interval } }, quantity: 1 }
}

export async function createStripeCheckoutSession(input: { tenantId: string; ownerUserId: string; email: string; planKey: string; addonKeys?: string[]; successUrl: string; cancelUrl: string }) {
	if (isMpesaOnlySaasBilling()) throw new BillingError("M-Pesa is the only supported Nurava billing method at launch", 409, "MPESA_ONLY_BILLING")
	if (!isStripeConfigured()) throw new BillingError("Stripe is not configured", 503, "STRIPE_NOT_CONFIGURED")
	const { plan, addons } = await getPlanAndAddons(input.planKey, input.addonKeys || [])
	const billing = await ensureBillingRecords(input.tenantId, input.ownerUserId)
	const existing = await prisma.subscription.findFirst({ where: { tenantId: input.tenantId, status: { in: [...paidSubscriptionStatuses] } }, orderBy: { createdAt: "desc" } })
	if (existing && existing.planId === plan.id && billing.record.setupFeeStatus !== BillingRecordStatus.PENDING) throw new BillingError("This plan is already active", 409, "PLAN_ALREADY_ACTIVE")
	const customerId = await ensureStripeCustomer(input.tenantId, input.ownerUserId, input.email)
	const lineItems: any[] = [recurringLineItem(plan.name, plan.price || 0, plan.currency, plan.billingInterval === "YEAR" ? "year" : "month", plan.stripePriceId)]
	for (const addon of addons) lineItems.push(recurringLineItem(addon.name, addon.price, addon.currency, addon.billingInterval === "YEAR" ? "year" : "month", addon.stripePriceId))
	if (billing.record.setupFeeStatus === BillingRecordStatus.PENDING && billing.record.setupFeeAmount > 0) {
		lineItems.push({ price_data: { currency: billing.record.currency.toLowerCase(), product_data: { name: "One-time onboarding/setup fee" }, unit_amount: stripeAmount(billing.record.setupFeeAmount, billing.record.currency) }, quantity: 1 })
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
	const current = await prisma.subscription.findFirst({ where: { tenantId: input.tenantId, status: { in: [...paidSubscriptionStatuses] } }, orderBy: { createdAt: "desc" } })
	if (!current) return createStripeCheckoutSession(input)
	const { plan } = await getPlanAndAddons(input.planKey, [])
	if (current.planId === plan.id) throw new BillingError("This plan is already active", 409, "PLAN_ALREADY_ACTIVE")
	if (isMpesaOnlySaasBilling()) {
		const scheduled = await prisma.subscription.update({ where: { id: current.id }, data: { pendingPlanId: plan.id } })
		return { subscriptionId: scheduled.id, provider: "mpesa" as const, changed: false, scheduled: true, nextRenewal: true, plan: plan.name }
	}
	if (current.provider !== "stripe" || !current.providerSubscriptionId || !isStripeConfigured()) throw new BillingError("This subscription uses invoice-driven billing. Request an M-Pesa renewal after the platform configures the target plan price.", 409, "PLAN_CHANGE_REQUIRES_PROVIDER")
	if (!plan.stripePriceId) throw new BillingError("The target plan needs a Stripe price ID before an existing subscription can be changed", 409, "PLAN_PRICE_NOT_CONFIGURED")
	const stripe = getStripeClient()
	const remote = await stripe.subscriptions.retrieve(current.providerSubscriptionId)
	const baseItem = (remote.items?.data || [])[0] as any
	if (!baseItem?.id) throw new BillingError("Stripe subscription items are unavailable", 502, "STRIPE_SUBSCRIPTION_INVALID")
	const updatedRemote = await stripe.subscriptions.update(current.providerSubscriptionId, { items: [{ id: baseItem.id, price: plan.stripePriceId }], proration_behavior: "create_prorations", metadata: { tenantId: input.tenantId, planId: plan.id, subscriptionId: current.id } })
	const updated = await prisma.subscription.update({ where: { id: current.id }, data: { planId: plan.id, status: mapStripeSubscriptionStatus(updatedRemote.status), currentPeriodStart: dateFromUnix((updatedRemote as any).current_period_start), currentPeriodEnd: dateFromUnix((updatedRemote as any).current_period_end) } })
	await prisma.tenant.update({ where: { id: input.tenantId }, data: { planId: plan.id } })
	return { subscriptionId: updated.id, provider: "stripe" as const, changed: true }
}

export async function createMpesaInvoicePayment(input: { tenantId: string; ownerUserId: string; phone: string; kind?: InvoiceKind }) {
	const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId }, include: { plan: true, billingRecord: true, subscriptions: { where: { status: { in: [...paidSubscriptionStatuses] } }, orderBy: { createdAt: "desc" }, take: 1, include: { plan: true, pendingPlan: true, addonSubscriptions: { where: { status: { in: ["ACTIVE", "INCOMPLETE"] } }, include: { addon: true } } } } } })
	if (!tenant?.plan || !tenant.subscriptions[0]) throw new BillingError("An active subscription is required before requesting a renewal", 409, "NO_ACTIVE_SUBSCRIPTION")
	const subscription = tenant.subscriptions[0]
	const billingPlan = subscription.pendingPlan || subscription.plan || tenant.plan
	const addonTotal = subscription.addonSubscriptions.reduce((sum, item) => sum + item.addon.price, 0)
	const setupFeeAmount = tenant.billingRecord && tenant.billingRecord.setupFeeStatus !== BillingRecordStatus.PAID ? tenant.billingRecord.setupFeeAmount : 0
	const firstActivation = subscription.status === "TRIALING" || !subscription.currentPeriodStart
	if (firstActivation && subscription.trialEndsAt && subscription.trialEndsAt > new Date()) throw new BillingError("Your 30-day trial is still active. Payment becomes available after the trial ends.", 409, "TRIAL_ACTIVE")
	const total = (billingPlan.price || 0) + addonTotal + (firstActivation ? setupFeeAmount : 0)
	if (total <= 0) throw new BillingError("The selected plan has no payable amount", 409, "BILLING_TOTAL_ZERO")
	const kind = firstActivation ? InvoiceKind.SUBSCRIPTION : input.kind || InvoiceKind.RENEWAL
	const invoice = await prisma.invoice.create({ data: { tenantId: input.tenantId, subscriptionId: subscription.id, kind, status: "OPEN", subtotal: billingPlan.price || 0, addonTotal, setupFeeAmount: firstActivation ? setupFeeAmount : 0, total, currency: billingPlan.currency, dueDate: new Date(Date.now() + 3 * 86400000) } })
	const result = await initiateMpesaPayment({ amount: total, phone: input.phone, reference: `INV-${invoice.id}`, tenantId: input.tenantId, invoiceId: invoice.id, subscriptionId: subscription.id, billingRecordId: firstActivation && setupFeeAmount > 0 ? tenant.billingRecord?.id : undefined, kind: firstActivation ? BillingPaymentKind.SUBSCRIPTION : BillingPaymentKind.RENEWAL, metadata: { invoiceId: invoice.id, invoiceKind: invoice.kind, planId: billingPlan.id } })
	if (!result.ok) await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "FAILED" } })
	return { ...result, invoiceId: invoice.id }
}

export async function createSetupFeeMpesaPayment(input: { tenantId: string; ownerUserId: string; phone: string }) {
	throw new BillingError("The setup fee is collected together with the first subscription payment after the trial.", 409, "SETUP_FEE_WITH_SUBSCRIPTION")
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
	if (isMpesaOnlySaasBilling()) throw new BillingError("M-Pesa is the only supported Nurava billing method at launch", 409, "MPESA_ONLY_BILLING")
	if (!isStripeConfigured()) throw new BillingError("Stripe is not configured", 503, "STRIPE_NOT_CONFIGURED")
	const customer = await prisma.billingCustomer.findUnique({ where: { tenantId } })
	if (!customer?.stripeCustomerId) throw new BillingError("No Stripe customer is linked to this tenant", 409, "STRIPE_CUSTOMER_NOT_FOUND")
	return getStripeClient().billingPortal.sessions.create({ customer: customer.stripeCustomerId, return_url: returnUrl })
}

export async function applyStripeSubscriptionEvent(subscriptionObject: Record<string, any>) {
	const providerId = String(subscriptionObject.id || "")
	const metadata = (subscriptionObject.metadata || {}) as Record<string, string>
	const tenantId = metadata.tenantId || undefined
	const local = await prisma.subscription.findFirst({ where: { OR: [{ providerSubscriptionId: providerId }, ...(tenantId ? [{ tenantId, id: metadata.subscriptionId || "" }] : [])] } })
	if (!local) return null
	const status = mapStripeSubscriptionStatus(String(subscriptionObject.status || "incomplete"))
	const updated = await prisma.subscription.update({ where: { id: local.id }, data: { provider: "stripe", providerSubscriptionId: providerId, providerCustomerId: String(subscriptionObject.customer || local.providerCustomerId || ""), status, currentPeriodStart: dateFromUnix(subscriptionObject.current_period_start), currentPeriodEnd: dateFromUnix(subscriptionObject.current_period_end), cancelAtPeriodEnd: Boolean(subscriptionObject.cancel_at_period_end) } })
	await prisma.tenant.update({ where: { id: updated.tenantId }, data: { status: tenantStatusForSubscription(status), planId: updated.planId } }).catch(() => undefined)
	return updated
}

export async function applyStripeCheckoutCompleted(sessionObject: Record<string, any>) {
	const metadata = (sessionObject.metadata || {}) as Record<string, string>
	const local = metadata.subscriptionId ? await prisma.subscription.findUnique({ where: { id: metadata.subscriptionId } }) : null
	if (!local) return null
	await prisma.subscription.update({ where: { id: local.id }, data: { provider: "stripe", providerCustomerId: String(sessionObject.customer || local.providerCustomerId || ""), providerSubscriptionId: typeof sessionObject.subscription === "string" ? sessionObject.subscription : undefined, status: "INCOMPLETE" } })
	if (metadata.billingRecordId) await prisma.billingRecord.update({ where: { id: metadata.billingRecordId }, data: { setupFeeStatus: "PENDING" } }).catch(() => undefined)
	return local.id
}

export async function applyStripeInvoiceEvent(invoiceObject: Record<string, any>, paid: boolean, failed = false) {
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
		create: { tenantId: invoiceTenantId, subscriptionId: localSubscription?.id, kind: "RENEWAL", status: paid ? "PAID" : failed ? "FAILED" : "OPEN", provider: "stripe", providerInvoiceId, subtotal: Number(invoiceObject.subtotal || invoiceObject.amount_due || 0) / 100, total: Number(invoiceObject.amount_paid || invoiceObject.amount_due || 0) / 100, currency: String(invoiceObject.currency || "kes").toUpperCase(), paidAt: paid ? new Date() : undefined, hostedInvoiceUrl: invoiceObject.hosted_invoice_url || undefined, invoicePdfUrl: invoiceObject.invoice_pdf || undefined },
	})
	const paymentIntentId = typeof invoiceObject.payment_intent === "string" ? invoiceObject.payment_intent : undefined
	if (paymentIntentId && localInvoice.tenantId) {
		await prisma.payment.upsert({ where: { providerReference: paymentIntentId }, update: { status: paid ? "COMPLETED" : failed ? "FAILED" : "PENDING", invoiceId: localInvoice.id, subscriptionId: localSubscription?.id, failureReason: failed ? "Stripe invoice payment failed" : undefined }, create: { tenantId: localInvoice.tenantId, invoiceId: localInvoice.id, subscriptionId: localSubscription?.id, provider: "stripe", providerReference: paymentIntentId, amount: Number(invoiceObject.amount_paid || invoiceObject.amount_due || 0) / 100, currency: localInvoice.currency, status: paid ? "COMPLETED" : failed ? "FAILED" : "PENDING", kind: "RENEWAL", metadata: { providerInvoiceId } } }).catch(() => undefined)
	}
	if (localSubscription) await prisma.subscription.update({ where: { id: localSubscription.id }, data: { status: paid ? "ACTIVE" : failed ? "PAST_DUE" : localSubscription.status } })
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

export async function markBillingPaymentFromMpesa(payment: { id: string; status: string; invoiceId?: string | null; subscriptionId?: string | null; billingRecordId?: string | null; failureReason?: string | null }) {
	const completed = payment.status === "COMPLETED"
	if (payment.invoiceId) await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: completed ? "PAID" : "FAILED", paidAt: completed ? new Date() : undefined } }).catch(() => undefined)
	if (payment.subscriptionId && completed) {
		const subscription = await prisma.subscription.findUnique({ where: { id: payment.subscriptionId }, select: { tenantId: true, pendingPlanId: true } })
		const activated = await prisma.subscription.update({ where: { id: payment.subscriptionId }, data: { status: "ACTIVE", planId: subscription?.pendingPlanId || undefined, pendingPlanId: null, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000), gracePeriodEndsAt: null } }).catch(() => null)
		if (activated) {
			await prisma.addonSubscription.updateMany({ where: { subscriptionId: payment.subscriptionId, status: "INCOMPLETE" }, data: { status: "ACTIVE" } }).catch(() => undefined)
			await prisma.tenant.update({ where: { id: activated.tenantId }, data: { status: "ACTIVE", planId: activated.planId } }).catch(() => undefined)
		}
	}
	if (payment.billingRecordId) await prisma.billingRecord.update({ where: { id: payment.billingRecordId }, data: { setupFeeStatus: completed ? "PAID" : "FAILED", setupFeePaidAt: completed ? new Date() : undefined, failureReason: completed ? null : payment.failureReason || "M-Pesa payment failed" } }).catch(() => undefined)
}

export async function recordOrderCommission(paymentId: string) {
	if (!isShopperCheckoutEnabled()) return null
	const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { tenant: { include: { plan: true } } } })
	if (!payment?.tenantId || !payment.orderId || payment.status !== "COMPLETED") return null
	const rate = payment.tenant?.plan?.transactionFeePercent || 0
	return prisma.transaction.upsert({
		where: { paymentId },
		update: { grossAmount: payment.amount, commissionRate: rate, commissionAmount: calculateCommission(payment.amount, rate), status: "COMPLETED" },
		create: { tenantId: payment.tenantId, orderId: payment.orderId, paymentId, currency: payment.currency, grossAmount: payment.amount, commissionRate: rate, commissionAmount: calculateCommission(payment.amount, rate), status: "COMPLETED" },
	})
}
