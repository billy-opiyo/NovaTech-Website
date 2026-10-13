"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useToast } from "@/components/ui/Toast"

type Plan = {
	id: string
	key: string
	name: string
	price: number | null
	currency: string
	billingInterval: "MONTH" | "YEAR" | null
	setupFeeAmount: number
	transactionFeePercent: number
	stripePriceId?: string | null
	active: boolean
}

type Addon = { id: string; key: string; name: string; description?: string | null; price: number; currency: string; billingInterval: string; active: boolean }
type PaymentDestination = { accountType: "PAYBILL" | "TILL" | "PHONE" | null; accountNumber: string; version: number | null; configured: boolean; env: "production" | "sandbox"; passkeyConfigured: boolean; source: "DATABASE" | "ENVIRONMENT" }
type ManualPayment = { id: string; tenantId: string | null; amount: number; currency: string; kind: string; providerReference: string | null; phoneNumber: string | null; metadata: unknown; createdAt: string; tenant?: { legalName: string | null } | null; invoice?: { kind: string; status: string } | null }
type BillingData = { plans: Plan[]; addons: Addon[]; paymentDestination: PaymentDestination; paymentDestinations: PaymentDestination[]; manualPayments: ManualPayment[]; canManageCollection: boolean; stats: { subscriptionCount: number; activeSubscriptionCount: number; paidRevenue: number; generatedCommission: number }; failedPayments: { id: string; tenantId: string; provider: string; amount: number; currency: string; failureReason?: string | null }[] }

function money(value: number, currency = "KES") { return `${currency} ${Number(value || 0).toLocaleString()}` }
function humanize(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }

export default function PlatformBillingPage() {
	const [data, setData] = useState<BillingData | null>(null)
	const [message, setMessage] = useState("Loading platform billing…")
	const [key, setKey] = useState("")
	const [name, setName] = useState("")
	const [price, setPrice] = useState("")
	const [setupFeeAmount, setSetupFeeAmount] = useState("0")
	const [billingInterval, setBillingInterval] = useState<"MONTH" | "YEAR">("MONTH")
	const [active, setActive] = useState(true)
	const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
	const [destinationType, setDestinationType] = useState<"PAYBILL" | "TILL" | "PHONE">("PAYBILL")
	const [destinationNumber, setDestinationNumber] = useState("")
	const [destinationPasskey, setDestinationPasskey] = useState("")
	const [destinationBusy, setDestinationBusy] = useState(false)
	const planFormRef = useRef<HTMLFormElement>(null)
	const { addToast } = useToast()

	async function load() {
		const response = await fetch("/api/platform/billing", { cache: "no-store" })
		const result = await response.json()
		if (!response.ok) throw new Error(result.message || "Platform billing unavailable")
		setData(result)
		if (result.paymentDestination) {
			setDestinationType(result.paymentDestination.accountType || "PAYBILL")
			setDestinationNumber(result.paymentDestinations?.find((item: PaymentDestination) => item.accountType === result.paymentDestination.accountType)?.accountNumber || "")
		}
		setMessage("")
	}

	useEffect(() => { load().catch((error) => setMessage(error.message || "Platform billing unavailable")) }, [])

	useEffect(() => {
		if (!editingPlanId) return
		requestAnimationFrame(() => planFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
	}, [editingPlanId])

	function editPlan(plan: Plan) {
		setEditingPlanId(plan.id)
		setKey(plan.key)
		setName(plan.name)
		setPrice(plan.price == null ? "" : String(plan.price))
		setSetupFeeAmount(String(plan.setupFeeAmount || 0))
		setBillingInterval(plan.billingInterval || "MONTH")
		setActive(plan.active)
	}

	function clearForm() {
		setEditingPlanId(null)
		setKey("")
		setName("")
		setPrice("")
		setSetupFeeAmount("0")
		setBillingInterval("MONTH")
		setActive(true)
	}

	async function savePlan(event: FormEvent) {
		event.preventDefault()
		setMessage("Saving plan…")
		const response = await fetch("/api/platform/billing", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "plan", key: key.toUpperCase(), name, price: price === "" ? null : Number(price), currency: "KES", billingInterval: price === "" ? null : billingInterval, setupFeeAmount: Number(setupFeeAmount), transactionFeePercent: 0, active }),
		})
		const result = await response.json()
	if (!response.ok) { const message = result.message || "Unable to save plan"; setMessage(message); addToast(message, "error"); return }
		setMessage("Plan saved")
		addToast("Plan saved successfully.", "success")
		clearForm()
		await load()
	}

	async function savePaymentDestination(event: FormEvent) {
		event.preventDefault()
		setDestinationBusy(true)
		setMessage("Saving M-Pesa collection destination…")
		try {
			const response = await fetch("/api/platform/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mpesa_destination", accountType: destinationType, accountNumber: destinationNumber, ...(destinationPasskey ? { passkey: destinationPasskey } : {}) }) })
			const result = await response.json()
			if (!response.ok) throw new Error(result.message || "Unable to save M-Pesa destination")
			setDestinationPasskey("")
			setMessage("M-Pesa billing destination saved.")
			addToast("M-Pesa billing destination saved.", "success")
			await load()
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "Unable to save M-Pesa destination"
			setMessage(errorMessage)
			addToast(errorMessage, "error")
		} finally { setDestinationBusy(false) }
	}

	async function reviewManualPayment(paymentId: string, approve: boolean) {
		const response = await fetch("/api/platform/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review_manual_payment", paymentId, approve }) })
		const result = await response.json()
		if (!response.ok) throw new Error(result.message || "Manual payment review failed")
		addToast(result.message || "Payment review saved.", approve ? "success" : "info")
		await load()
	}

	function selectDestinationType(accountType: "PAYBILL" | "TILL" | "PHONE") {
		setDestinationType(accountType)
		setDestinationNumber(data?.paymentDestinations.find((item) => item.accountType === accountType)?.accountNumber || "")
		setDestinationPasskey("")
	}

	async function disablePaymentDestination(accountType: "PAYBILL" | "TILL" | "PHONE") {
		setDestinationBusy(true)
		try {
			const response = await fetch("/api/platform/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disable_mpesa_destination", accountType }) })
			const result = await response.json()
			if (!response.ok) throw new Error(result.message || "Unable to disable payment option")
			addToast(`${humanize(accountType)} payments disabled.`, "success")
			await load()
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "Unable to disable payment option"
			addToast(errorMessage, "error")
		} finally { setDestinationBusy(false) }
	}

	if (!data) return <div className="glass-card p-6"><p>{message}</p><p className="mt-2 text-sm text-amber-700">Billing configuration requires the platform database. No placeholder prices or revenue data are shown.</p></div>

	return <div className="space-y-6">
		<div><h2 className="text-3xl font-bold">Plans and billing</h2><p className="mt-2 text-gray-600 dark:text-gray-300">Configure merchant SaaS subscriptions and one-time onboarding fees.</p><p className="mt-2 text-sm text-gray-500">Shopper purchases are completed directly with independent stores. Commission totals below are historical records only; new shopper payments are disabled.</p></div>
		{message && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="glass-card p-5"><p className="text-sm text-gray-500">Subscriptions</p><p className="mt-2 text-2xl font-bold">{data.stats.subscriptionCount}</p></div><div className="glass-card p-5"><p className="text-sm text-gray-500">Active / trialing</p><p className="mt-2 text-2xl font-bold">{data.stats.activeSubscriptionCount}</p></div><div className="glass-card p-5"><p className="text-sm text-gray-500">Paid invoice revenue</p><p className="mt-2 text-2xl font-bold">{money(data.stats.paidRevenue)}</p></div><div className="glass-card p-5"><p className="text-sm text-gray-500">Legacy commission records</p><p className="mt-2 text-2xl font-bold">{money(data.stats.generatedCommission)}</p></div></div>
		<section className="glass-card space-y-4 p-5" aria-labelledby="platform-mpesa-destination-title">
			<div><h3 id="platform-mpesa-destination-title" className="text-xl font-semibold">Platform M-Pesa collection options</h3><p className="mt-1 text-sm text-gray-500">Enable PayBill, Till, and/or phone transfer for merchant setup fees, subscriptions, and add-on invoices. This does not change shopper payments configured by each store.</p></div>
			<div className="space-y-2">{data.paymentDestinations.length ? data.paymentDestinations.map((destination) => <div key={`${destination.accountType}:${destination.version ?? "environment"}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span><b>{humanize(destination.accountType || "")}</b> {destination.accountNumber} · {destination.env} · {destination.source === "ENVIRONMENT" ? "server environment" : destination.configured ? "ready" : "credentials incomplete"}{destination.accountType === "PHONE" ? " · receipt review required" : ""}</span>{data.canManageCollection && <button type="button" disabled={destinationBusy} onClick={() => destination.accountType && void disablePaymentDestination(destination.accountType)} className="rounded border px-3 py-1 text-xs font-semibold">Disable</button>}</div>) : <p className="text-sm text-amber-700">No platform M-Pesa payment options are enabled.</p>}</div>
			{data.canManageCollection ? <form onSubmit={savePaymentDestination} className="grid gap-3 sm:grid-cols-2">
				<label className="grid gap-1 text-sm font-semibold">Add or update payment option<select value={destinationType} onChange={(event) => selectDestinationType(event.target.value as "PAYBILL" | "TILL" | "PHONE")} className="rounded border p-2 font-normal dark:bg-dark-surface"><option value="PAYBILL">PayBill (automatic M-Pesa prompt)</option><option value="TILL">Till / Buy Goods (automatic M-Pesa prompt)</option><option value="PHONE">Registered phone number (manual transfer)</option></select></label>
				<label className="grid gap-1 text-sm font-semibold">{destinationType === "PHONE" ? "Registered M-Pesa phone number" : `${destinationType === "TILL" ? "Till" : "PayBill"} number`}<input required value={destinationNumber} onChange={(event) => setDestinationNumber(event.target.value)} placeholder={destinationType === "PHONE" ? "07XXXXXXXX" : "Enter the business short code"} className="rounded border p-2 font-normal dark:bg-dark-surface" /></label>
				{destinationType !== "PHONE" && <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Daraja passkey<input type="password" autoComplete="new-password" value={destinationPasskey} onChange={(event) => setDestinationPasskey(event.target.value)} placeholder={data.paymentDestinations.find((item) => item.accountType === destinationType)?.passkeyConfigured ? "Saved securely; leave blank to keep this option's current passkey" : "Enter the passkey for this shortcode"} className="rounded border p-2 font-normal dark:bg-dark-surface" /><span className="font-normal text-gray-500">Encrypted on the server. Consumer key and consumer secret stay in the server environment; no credentials are sent to the browser.</span></label>}
				{destinationType === "PHONE" && <p className="text-sm text-amber-800 dark:text-amber-200 sm:col-span-2">Daraja STK prompts pay a business short code, not a personal phone. Merchants will send money to this phone and submit the M-Pesa receipt; a platform administrator must verify it before billing changes.</p>}
				<div className="sm:col-span-2"><button disabled={destinationBusy} className="btn-primary" type="submit">{destinationBusy ? "Saving…" : `Save ${humanize(destinationType)} option`}</button></div>
			</form> : <p className="text-sm text-gray-500">Platform-owner authorization is required to change collection options.</p>}
		</section>
		<section className="glass-card space-y-3 p-5" aria-labelledby="manual-mpesa-review-title"><div><h3 id="manual-mpesa-review-title" className="text-xl font-semibold">Phone-transfer receipts awaiting review</h3><p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Verify each receipt against the M-Pesa account statement before approving. Approval activates the associated setup fee or invoice.</p></div>{data.manualPayments.length ? <div className="divide-y divide-gray-200 dark:divide-gray-700">{data.manualPayments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><b>{payment.tenant?.legalName || payment.tenantId || "Merchant"}</b><p>{humanize(payment.kind)} · {money(payment.amount, payment.currency)} · receipt {payment.providerReference || "missing"}</p><p className="text-xs text-gray-500">Submitted {new Date(payment.createdAt).toLocaleString()} · payer {payment.phoneNumber || "not recorded"}</p></div>{data.canManageCollection && <div className="flex gap-2"><button type="button" onClick={() => reviewManualPayment(payment.id, true).catch((error: unknown) => addToast(error instanceof Error ? error.message : "Review failed", "error"))} className="rounded border border-emerald-600 px-3 py-1 font-semibold text-emerald-700">Verify and apply</button><button type="button" onClick={() => reviewManualPayment(payment.id, false).catch((error: unknown) => addToast(error instanceof Error ? error.message : "Review failed", "error"))} className="rounded border border-red-600 px-3 py-1 font-semibold text-red-700">Reject</button></div>}</div>)}</div> : <p className="text-sm text-gray-500">No phone-transfer receipts are waiting for review.</p>}</section>
		<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="glass-card p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Configured plans</h3><button type="button" onClick={clearForm} className="text-sm font-semibold text-primary">New plan</button></div><div className="mt-3 divide-y divide-gray-100">{data.plans.map((plan) => <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span><b>{plan.name}</b> <span className="text-gray-500">({plan.key})</span><br /><span className="text-xs text-gray-500">Subscription: {plan.price == null ? "Trial" : `${money(plan.price, plan.currency)} / ${plan.billingInterval?.toLowerCase()}`} · Setup: {money(plan.setupFeeAmount, plan.currency)}</span></span><span className="flex items-center gap-3"><span>{plan.active ? "Active" : "Inactive"}</span><button type="button" onClick={() => editPlan(plan)} className="rounded border px-3 py-1 text-xs font-semibold">Edit</button></span></div>)}</div><form ref={planFormRef} onSubmit={savePlan} className="mt-5 scroll-mt-24 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Plan key<input required value={key} onChange={(event) => setKey(event.target.value)} placeholder="STARTER" className="rounded border p-2 font-normal dark:bg-dark-surface" /></label><label className="grid gap-1 text-sm font-semibold">Plan name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Starter" className="rounded border p-2 font-normal dark:bg-dark-surface" /></label><label className="grid gap-1 text-sm font-semibold">Recurring price<input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Blank for trial" className="rounded border p-2 font-normal dark:bg-dark-surface" /></label><label className="grid gap-1 text-sm font-semibold">One-time setup fee<input required type="number" min="0" value={setupFeeAmount} onChange={(event) => setSetupFeeAmount(event.target.value)} className="rounded border p-2 font-normal dark:bg-dark-surface" /></label><label className="grid gap-1 text-sm font-semibold">Billing interval<select value={billingInterval} onChange={(event) => setBillingInterval(event.target.value as "MONTH" | "YEAR")} disabled={price === ""} className="rounded border p-2 font-normal dark:bg-dark-surface"><option value="MONTH">Monthly</option><option value="YEAR">Yearly</option></select></label><label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active plan</label><div className="flex gap-2 sm:col-span-2"><button className="btn-primary">Save plan</button><button type="button" onClick={clearForm} className="rounded border px-4 py-2 font-semibold">Clear</button></div></form></div>
			<div className="glass-card p-5"><h3 className="text-xl font-semibold">Add-ons</h3><div className="mt-3 divide-y divide-gray-100">{data.addons.map((addon) => <div key={addon.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span><b>{addon.name}</b> <span className="text-gray-500">({addon.key})</span></span><span>{money(addon.price, addon.currency)} / {addon.billingInterval.toLowerCase()} · {addon.active ? "Active" : "Inactive"}</span></div>)}</div><p className="mt-4 text-sm text-gray-500">Add-ons are database-managed through the platform billing API and can optionally be linked to Stripe recurring price IDs.</p></div>
		</div>
		<div className="glass-card p-5"><h3 className="text-xl font-semibold">Failed SaaS payments</h3>{data.failedPayments.length ? <div className="mt-3 divide-y divide-gray-100">{data.failedPayments.map((payment) => <div key={payment.id} className="flex justify-between gap-3 py-3 text-sm"><span>{payment.provider} · tenant {payment.tenantId}</span><span>{money(payment.amount, payment.currency)} · {humanize(payment.failureReason || "Failed")}</span></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No failed SaaS payments recorded.</p>}</div>
	</div>
}
