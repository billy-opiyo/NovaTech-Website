"use client"

import { useEffect, useState } from "react"

type Plan = { id: string; key: string; name: string; price: number | null; currency: string; billingInterval: string | null; setupFeeAmount: number; transactionFeePercent: number }
type Addon = { id: string; key: string; name: string; description?: string | null; price: number; currency: string; billingInterval: string }
type BillingData = { tenant: any; subscription: any; activeAddons: any[]; billingRecord: any; invoices: any[]; payments: any[]; usage: any[]; plans: Plan[]; addons: Addon[] }

function humanize(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function date(value?: string | null) { return value ? new Date(value).toLocaleDateString() : "Not configured" }

export default function ManageBillingPage() {
	const [data, setData] = useState<BillingData | null>(null)
	const [message, setMessage] = useState("Loading billing…")
	const [phone, setPhone] = useState("")
	const [busy, setBusy] = useState("")

	async function load() {
		const response = await fetch("/api/manage/billing", { cache: "no-store" })
		const result = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(result.message || "Billing unavailable")
		setData(result); setMessage("")
	}
	useEffect(() => { load().catch((error) => setMessage(error.message)) }, [])

	async function action(actionName: string, body: Record<string, unknown> = {}) {
		setBusy(actionName); setMessage("")
		try {
			const response = await fetch("/api/manage/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, ...body }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Billing action failed")
			if (result.url) window.location.assign(result.url)
			else { setMessage(result.message || "Billing updated"); await load() }
		} catch (error: any) { setMessage(error.message || "Billing action failed") }
		finally { setBusy("") }
	}

	if (message && !data) return <div className="glass-card p-6"><p>{message}</p><p className="mt-2 text-sm text-amber-700">Billing requires a configured database and provider credentials for live collection.</p></div>
	if (!data) return null
	const currentPlan = data.subscription?.plan || data.tenant.plan
	const setupPending = data.billingRecord?.setupFeeStatus === "PENDING"
	const renewalControls = data.subscription ? <div className="glass-card p-5"><h2 className="text-xl font-semibold">Renewal and payment methods</h2><p className="mt-2 text-sm text-gray-500">M-Pesa renewals create an invoice and activate the next billing period only after callback confirmation. Stripe payment methods are managed in the secure provider portal.</p><div className="mt-3 flex flex-wrap gap-2"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="07XXXXXXXX" className="rounded-lg border p-2 dark:bg-dark-surface"/><button disabled={!!busy || !phone} onClick={() => action("renew_mpesa", { phone })} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Renew with M-Pesa</button><button disabled={!!busy} onClick={() => action("portal")} className="rounded-lg border border-gray-400 px-4 py-2 font-semibold">Manage Stripe payment method</button></div></div> : null
	return <div className="space-y-6">
		<div><h1 className="text-3xl font-bold">Subscription and billing</h1><p className="mt-1 text-gray-500">Manage the merchant workspace subscription separately from shopper checkout.</p></div>
		{renewalControls}
		{message && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
		<div className="grid gap-4 md:grid-cols-3">
			<div className="glass-card p-5"><p className="text-sm text-gray-500">Current plan</p><h2 className="mt-2 text-2xl font-semibold">{currentPlan?.name || "Not selected"}</h2><p className="mt-2 text-sm">{humanize(data.subscription?.status || data.tenant.status)}</p><p className="mt-1 text-sm text-gray-500">Period ends {date(data.subscription?.currentPeriodEnd || data.subscription?.trialEndsAt)}</p></div>
			<div className="glass-card p-5"><p className="text-sm text-gray-500">Setup fee</p><h2 className="mt-2 text-2xl font-semibold">{humanize(data.billingRecord?.setupFeeStatus || "PENDING")}</h2><p className="mt-1 text-sm text-gray-500">{data.billingRecord?.currency || "KES"} {(data.billingRecord?.setupFeeAmount || 0).toLocaleString()}</p></div>
			<div className="glass-card p-5"><p className="text-sm text-gray-500">Transaction commission</p><h2 className="mt-2 text-2xl font-semibold">{currentPlan?.transactionFeePercent ?? 0}%</h2><p className="mt-1 text-sm text-gray-500">Snapshotted per completed order.</p></div>
		</div>
		{setupPending && <div className="glass-card p-5"><h2 className="text-xl font-semibold">Complete onboarding payment</h2><p className="mt-2 text-sm text-gray-500">The one-time setup fee is tracked separately from your recurring subscription.</p><div className="mt-4 flex flex-wrap gap-3"><button disabled={!!busy} onClick={() => action("checkout", { planKey: currentPlan?.key || "STARTER" })} className="btn-primary">Pay with Stripe</button><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="07XXXXXXXX" className="rounded-lg border p-2 dark:bg-dark-surface" /><button disabled={!!busy || !phone} onClick={() => action("setup_mpesa", { phone })} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Pay with M-Pesa</button></div></div>}
		<div className="glass-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Plans</h2>{data.subscription && <button disabled={!!busy} onClick={() => action("cancel", { immediate: false })} className="text-sm text-red-600">Cancel at period end</button>}</div><div className="mt-4 grid gap-4 md:grid-cols-3">{data.plans.map((plan) => <div key={plan.key} className={`rounded-xl border p-4 ${plan.key === currentPlan?.key ? "border-primary" : "border-gray-200"}`}><h3 className="font-semibold">{plan.name}</h3><p className="mt-2 text-lg">{plan.price == null ? "Trial" : `${plan.currency} ${plan.price.toLocaleString()} / ${plan.billingInterval?.toLowerCase()}`}</p><p className="mt-1 text-xs text-gray-500">Setup: {plan.currency} {plan.setupFeeAmount.toLocaleString()} · commission {plan.transactionFeePercent}%</p>{plan.key === currentPlan?.key ? <span className="mt-4 inline-block text-sm text-primary">Current plan</span> : <button disabled={!!busy} onClick={() => action("change_plan", { planKey: plan.key })} className="mt-4 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary">{plan.price && currentPlan?.price && plan.price > currentPlan.price ? "Upgrade" : "Downgrade"}</button>}</div>)}</div></div>
		<div className="glass-card p-5"><h2 className="text-xl font-semibold">Add-ons</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{data.addons.map((addon) => { const active = data.activeAddons.some((item) => item.addon?.key === addon.key && !item.cancelAtPeriodEnd); return <div key={addon.key} className="rounded-xl border border-gray-200 p-4"><h3 className="font-semibold">{addon.name}</h3><p className="mt-1 text-sm text-gray-500">{addon.description || "Optional workspace capability"}</p><p className="mt-2 text-sm">{addon.currency} {addon.price.toLocaleString()} / {addon.billingInterval.toLowerCase()}</p><button disabled={!!busy} onClick={() => action(active ? "addon_unsubscribe" : "addon_subscribe", { addonKey: addon.key })} className="mt-3 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary">{active ? "Unsubscribe" : "Subscribe"}</button></div> })}</div></div>
		<div className="grid gap-6 lg:grid-cols-2"><div className="glass-card p-5"><h2 className="text-xl font-semibold">Invoices</h2>{data.invoices.length ? <div className="mt-3 divide-y divide-gray-100">{data.invoices.map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{humanize(invoice.kind)} · {date(invoice.createdAt)}</span><span>{invoice.currency} {invoice.total.toLocaleString()} · {humanize(invoice.status)}</span></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No invoices yet.</p>}</div><div className="glass-card p-5"><h2 className="text-xl font-semibold">Payment history</h2>{data.payments.length ? <div className="mt-3 divide-y divide-gray-100">{data.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{payment.provider} · {date(payment.createdAt)}</span><span>{payment.currency} {payment.amount.toLocaleString()} · {humanize(payment.status)}</span></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No SaaS payments yet.</p>}</div></div>
	</div>
}
